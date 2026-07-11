# Event Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Event Management System where users create events (admin-moderated), browse/search published events, and register (seat-limited, duplicate-safe) with emailed ticket confirmations; admins moderate events and export attendees.

**Architecture:** One Next.js App Router app. Business logic lives in a testable service layer (`lib/services/*`); route handlers in `app/api/**` are thin wrappers that validate (Zod) and call services. Mongoose talks to MongoDB via a cached singleton. Auth is JWT in an httpOnly cookie. UI uses shadcn/ui on Tailwind.

**Tech Stack:** Next.js (App Router, TypeScript), MongoDB + Mongoose, Zod, bcryptjs, jose (JWT), Nodemailer (Ethereal in dev), shadcn/ui + Tailwind, Vitest + mongodb-memory-server.

---

## File Structure

```
event-management-system/
├─ src/
│  ├─ lib/
│  │  ├─ db.ts                     # cached Mongoose connection
│  │  ├─ env.ts                    # env access + validation
│  │  ├─ auth.ts                   # hash/verify, JWT sign/verify, getCurrentUser
│  │  ├─ email.ts                  # nodemailer transport + sendConfirmation
│  │  ├─ ticket.ts                 # ticket number generator
│  │  ├─ http.ts                   # json() + error helpers for handlers
│  │  ├─ models/
│  │  │  ├─ User.ts
│  │  │  ├─ Event.ts
│  │  │  └─ Registration.ts
│  │  ├─ validation/
│  │  │  ├─ auth.ts
│  │  │  ├─ event.ts
│  │  │  └─ query.ts
│  │  └─ services/
│  │     ├─ users.ts               # register, login, updateProfile
│  │     ├─ events.ts             # create, list, get, update, delete, moderate, feeds
│  │     └─ registrations.ts      # register, cancel, myTickets, attendees, csv
│  ├─ middleware.ts                # route guards
│  ├─ app/
│  │  ├─ layout.tsx, page.tsx (home)
│  │  ├─ login/page.tsx, register/page.tsx, profile/page.tsx
│  │  ├─ events/page.tsx, events/[id]/page.tsx
│  │  ├─ events/new/page.tsx, events/[id]/edit/page.tsx
│  │  ├─ dashboard/page.tsx
│  │  ├─ admin/page.tsx
│  │  └─ api/
│  │     ├─ auth/{register,login,logout,me}/route.ts
│  │     ├─ events/route.ts, events/[id]/route.ts
│  │     ├─ events/[id]/register/route.ts
│  │     ├─ me/registrations/route.ts
│  │     └─ admin/events/route.ts, admin/events/[id]/moderate/route.ts,
│  │        admin/events/[id]/attendees/route.ts, admin/events/[id]/attendees/export/route.ts
│  ├─ components/ (shadcn ui + app components)
│  └─ scripts/seed.ts
├─ tests/ (Vitest)
└─ config files
```

Service functions take plain args and a `userId`/`role` where needed, so tests call them without HTTP. Handlers construct these from the request + auth cookie.

---

## Phase 0 — Scaffold & Tooling

### Task 0.1: Create Next.js app

- [ ] **Step 1: Scaffold**

Run in the project root (`event-management-system/`, which already contains `docs/`, `.git`, `.gitignore`):

```bash
npx create-next-app@latest . --ts --app --src-dir --tailwind --eslint --import-alias "@/*" --no-turbopack --use-npm
```

If prompted about a non-empty directory, choose to continue (keeps `docs/`, `.git`).

- [ ] **Step 2: Install runtime deps**

```bash
npm i mongoose zod bcryptjs jose nodemailer
npm i -D @types/bcryptjs @types/nodemailer
```

- [ ] **Step 3: Install test deps**

```bash
npm i -D vitest mongodb-memory-server @vitest/coverage-v8 tsx dotenv
```

- [ ] **Step 4: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

- [ ] **Step 5: Test DB setup (in-memory Mongo)**

Create `tests/setup.ts`:

```ts
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll } from 'vitest'

let mongo: MongoMemoryServer

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
  process.env.JWT_SECRET = 'test-secret'
  await mongoose.connect(process.env.MONGODB_URI)
})

afterEach(async () => {
  const { collections } = mongoose.connection
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})
```

- [ ] **Step 6: Add scripts to `package.json`**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"seed": "tsx src/scripts/seed.ts"
```

- [ ] **Step 7: Add `.env.local`**

Create `.env.local` (already git-ignored via `.env*.local`):

```
MONGODB_URI=mongodb://127.0.0.1:27017/event_management
JWT_SECRET=change-me-in-prod
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin12345
EMAIL_FROM="Events <no-reply@events.test>"
```

- [ ] **Step 8: Verify build tooling**

Run: `npm run test`
Expected: passes with "no test files found" (0 tests) — confirms Vitest + in-memory Mongo wiring loads.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with test tooling"
```

---

## Phase 1 — Database Connection & Env

### Task 1.1: Env accessor

**Files:** Create `src/lib/env.ts`

- [ ] **Step 1: Implement**

```ts
export function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback
  if (v === undefined) throw new Error(`Missing env var: ${key}`)
  return v
}
export const isProd = process.env.NODE_ENV === 'production'
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add env accessor"
```

### Task 1.2: Cached Mongoose connection

**Files:** Create `src/lib/db.ts`

- [ ] **Step 1: Implement (cached across hot-reload / serverless)**

```ts
import mongoose from 'mongoose'
import { env } from './env'

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
const g = globalThis as unknown as { _mongoose?: Cached }
const cached: Cached = g._mongoose ?? { conn: null, promise: null }
g._mongoose = cached

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(env('MONGODB_URI'), { bufferCommands: false })
  }
  cached.conn = await cached.promise
  return cached.conn
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add cached mongoose connection"
```

> Note: tests connect directly in `tests/setup.ts`; service code calls `dbConnect()` which is a no-op reuse once connected.

---

## Phase 2 — Models

### Task 2.1: User model

**Files:** Create `src/lib/models/User.ts`

- [ ] **Step 1: Implement**

```ts
import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose'

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
})

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string }
export const User: Model<UserDoc> = (models.User as Model<UserDoc>) || model<UserDoc>('User', UserSchema)
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: add User model"`

### Task 2.2: Event model

**Files:** Create `src/lib/models/Event.ts`

- [ ] **Step 1: Implement**

```ts
import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose'

const EventSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  time: { type: String, required: true },
  venue: { type: String, required: true },
  city: { type: String, required: true, index: true },
  capacity: { type: Number, required: true, min: 1 },
  registeredCount: { type: Number, default: 0 },
  price: { type: Number, default: 0, min: 0 },
  isFeatured: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending', index: true },
  organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
})
EventSchema.index({ title: 'text', description: 'text' })

export type EventDoc = InferSchemaType<typeof EventSchema> & { _id: string }
export const Event: Model<EventDoc> = (models.Event as Model<EventDoc>) || model<EventDoc>('Event', EventSchema)
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: add Event model"`

### Task 2.3: Registration model

**Files:** Create `src/lib/models/Registration.ts`

- [ ] **Step 1: Implement**

```ts
import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose'

const RegistrationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketNumber: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
})
RegistrationSchema.index({ user: 1, event: 1 }, { unique: true })

export type RegistrationDoc = InferSchemaType<typeof RegistrationSchema> & { _id: string }
export const Registration: Model<RegistrationDoc> =
  (models.Registration as Model<RegistrationDoc>) || model<RegistrationDoc>('Registration', RegistrationSchema)
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: add Registration model"`

---

## Phase 3 — Auth primitives

### Task 3.1: Ticket number generator

**Files:** Create `src/lib/ticket.ts`, Test `tests/ticket.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { makeTicketNumber } from '@/lib/ticket'

describe('makeTicketNumber', () => {
  it('formats as EVT-<eventFragment>-<6 alnum> and is unique-ish', () => {
    const a = makeTicketNumber('64b2f0aa11223344aabbccdd')
    const b = makeTicketNumber('64b2f0aa11223344aabbccdd')
    expect(a).toMatch(/^EVT-[a-z0-9]{6}-[A-Z0-9]{6}$/)
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run tests/ticket.test.ts`) → "makeTicketNumber is not a function".

- [ ] **Step 3: Implement**

```ts
import { randomBytes } from 'node:crypto'

export function makeTicketNumber(eventId: string): string {
  const frag = eventId.slice(-6).toLowerCase()
  const rand = randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
  return `EVT-${frag}-${rand}`
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add ticket number generator"`

### Task 3.2: Password + JWT helpers

**Files:** Create `src/lib/auth.ts`, Test `tests/auth.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, signToken, verifyToken } from '@/lib/auth'

describe('auth primitives', () => {
  it('hashes and verifies password', async () => {
    const h = await hashPassword('secret123')
    expect(h).not.toBe('secret123')
    expect(await verifyPassword('secret123', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })
  it('signs and verifies a JWT with sub + role', async () => {
    const token = await signToken({ sub: 'u1', role: 'admin' })
    const payload = await verifyToken(token)
    expect(payload?.sub).toBe('u1')
    expect(payload?.role).toBe('admin')
    expect(await verifyToken('garbage')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { env } from './env'

export type JwtClaims = { sub: string; role: 'user' | 'admin' }

const secret = () => new TextEncoder().encode(env('JWT_SECRET'))

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10)
}
export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash)
}
export async function signToken(claims: JwtClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}
export async function verifyToken(token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return { sub: String(payload.sub), role: (payload.role as 'user' | 'admin') ?? 'user' }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add password and JWT helpers"`

### Task 3.3: Cookie + current-user helpers

**Files:** Modify `src/lib/auth.ts` (append), Test `tests/auth-cookie.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { AUTH_COOKIE, currentUserFromToken } from '@/lib/auth'
import { signToken } from '@/lib/auth'

describe('cookie helpers', () => {
  it('exposes cookie name', () => { expect(AUTH_COOKIE).toBe('token') })
  it('resolves claims from a token string', async () => {
    const t = await signToken({ sub: 'abc', role: 'user' })
    const claims = await currentUserFromToken(t)
    expect(claims?.sub).toBe('abc')
    expect(await currentUserFromToken(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement (append to `src/lib/auth.ts`)**

```ts
export const AUTH_COOKIE = 'token'

export async function currentUserFromToken(token: string | undefined): Promise<JwtClaims | null> {
  if (!token) return null
  return verifyToken(token)
}

export const cookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add cookie and current-user helpers"`

---

## Phase 4 — Validation schemas

### Task 4.1: Auth + event + query Zod schemas

**Files:** Create `src/lib/validation/auth.ts`, `src/lib/validation/event.ts`, `src/lib/validation/query.ts`, Test `tests/validation.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema } from '@/lib/validation/auth'
import { createEventSchema } from '@/lib/validation/event'
import { listQuerySchema } from '@/lib/validation/query'

describe('validation', () => {
  it('rejects short password', () => {
    expect(registerSchema.safeParse({ name: 'A', email: 'a@b.com', password: '123' }).success).toBe(false)
  })
  it('accepts valid login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'longenough' }).success).toBe(true)
  })
  it('requires capacity >= 1', () => {
    const base = { title: 't', description: 'd', category: 'Tech', date: '2030-01-01', time: '10:00', venue: 'v', city: 'NYC', capacity: 0 }
    expect(createEventSchema.safeParse(base).success).toBe(false)
    expect(createEventSchema.safeParse({ ...base, capacity: 5 }).success).toBe(true)
  })
  it('coerces list query paging with defaults', () => {
    const r = listQuerySchema.parse({})
    expect(r.page).toBe(1)
    expect(r.limit).toBe(9)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/lib/validation/auth.ts`**

```ts
import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8).max(100).optional(),
})
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
```

- [ ] **Step 4: Implement `src/lib/validation/event.ts`**

```ts
import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.coerce.date(),
  time: z.string().min(1),
  venue: z.string().min(1),
  city: z.string().min(1),
  capacity: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0).default(0),
})
export const updateEventSchema = createEventSchema.partial()
export const moderateSchema = z.object({
  action: z.enum(['approve', 'reject']),
  isFeatured: z.boolean().optional(),
})
export type CreateEventInput = z.infer<typeof createEventSchema>
```

- [ ] **Step 5: Implement `src/lib/validation/query.ts`**

```ts
import { z } from 'zod'

export const listQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  when: z.enum(['upcoming', 'past']).optional(),
  price: z.enum(['free', 'paid']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(9),
})
export type ListQuery = z.infer<typeof listQuerySchema>
```

- [ ] **Step 6: Run — expect PASS**

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: add Zod validation schemas"`

---

## Phase 5 — User service (register/login/profile)

### Task 5.1: registerUser + loginUser

**Files:** Create `src/lib/services/users.ts`, Test `tests/services/users.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { registerUser, loginUser, updateProfile } from '@/lib/services/users'
import { ServiceError } from '@/lib/services/errors'

describe('user service', () => {
  it('registers a new user and returns claims', async () => {
    const { user, claims } = await registerUser({ name: 'Ann', email: 'ANN@x.com', password: 'password1' })
    expect(user.email).toBe('ann@x.com')
    expect(user.role).toBe('user')
    expect(claims.sub).toBe(String(user._id))
  })
  it('rejects duplicate email', async () => {
    await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    await expect(registerUser({ name: 'B', email: 'a@x.com', password: 'password1' }))
      .rejects.toMatchObject({ status: 409 } as ServiceError)
  })
  it('auto-promotes ADMIN_EMAIL to admin', async () => {
    process.env.ADMIN_EMAIL = 'boss@x.com'
    const { user } = await registerUser({ name: 'Boss', email: 'boss@x.com', password: 'password1' })
    expect(user.role).toBe('admin')
  })
  it('logs in with correct password, rejects wrong', async () => {
    await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const ok = await loginUser({ email: 'a@x.com', password: 'password1' })
    expect(ok.claims.sub).toBeDefined()
    await expect(loginUser({ email: 'a@x.com', password: 'nope' }))
      .rejects.toMatchObject({ status: 401 })
  })
  it('updates profile name and password', async () => {
    const { user } = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const updated = await updateProfile(String(user._id), { name: 'A2' })
    expect(updated.name).toBe('A2')
    await updateProfile(String(user._id), { password: 'newpass12' })
    const ok = await loginUser({ email: 'a@x.com', password: 'newpass12' })
    expect(ok.claims.sub).toBe(String(user._id))
  })
})
```

- [ ] **Step 2: Create `src/lib/services/errors.ts`**

```ts
export class ServiceError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
```

- [ ] **Step 3: Run — expect FAIL**

- [ ] **Step 4: Implement `src/lib/services/users.ts`**

```ts
import { dbConnect } from '@/lib/db'
import { User } from '@/lib/models/User'
import { hashPassword, verifyPassword, type JwtClaims } from '@/lib/auth'
import { ServiceError } from './errors'
import type { RegisterInput, LoginInput } from '@/lib/validation/auth'

type PublicUser = { _id: string; name: string; email: string; role: 'user' | 'admin' }
const toPublic = (u: any): PublicUser => ({ _id: String(u._id), name: u.name, email: u.email, role: u.role })

export async function registerUser(input: RegisterInput): Promise<{ user: PublicUser; claims: JwtClaims }> {
  await dbConnect()
  const email = input.email.toLowerCase()
  const exists = await User.findOne({ email })
  if (exists) throw new ServiceError(409, 'Email already registered')
  const role = email === (process.env.ADMIN_EMAIL ?? '').toLowerCase() ? 'admin' : 'user'
  const user = await User.create({ name: input.name, email, passwordHash: await hashPassword(input.password), role })
  return { user: toPublic(user), claims: { sub: String(user._id), role } }
}

export async function loginUser(input: LoginInput): Promise<{ user: PublicUser; claims: JwtClaims }> {
  await dbConnect()
  const user = await User.findOne({ email: input.email.toLowerCase() })
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ServiceError(401, 'Invalid credentials')
  }
  return { user: toPublic(user), claims: { sub: String(user._id), role: user.role } }
}

export async function updateProfile(userId: string, patch: { name?: string; password?: string }): Promise<PublicUser> {
  await dbConnect()
  const update: Record<string, unknown> = {}
  if (patch.name) update.name = patch.name
  if (patch.password) update.passwordHash = await hashPassword(patch.password)
  const user = await User.findByIdAndUpdate(userId, update, { new: true })
  if (!user) throw new ServiceError(404, 'User not found')
  return toPublic(user)
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  await dbConnect()
  const u = await User.findById(userId)
  return u ? toPublic(u) : null
}
```

- [ ] **Step 5: Run — expect PASS** (`npx vitest run tests/services/users.test.ts`)

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add user service (register/login/profile)"`

---

## Phase 6 — Event service

### Task 6.1: createEvent + getEvent + updateEvent + deleteEvent

**Files:** Create `src/lib/services/events.ts`, Test `tests/services/events.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent, getEvent, updateEvent, deleteEvent } from '@/lib/services/events'

const sample = { title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'), time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0 }

describe('event service CRUD', () => {
  it('creates event as pending owned by creator', async () => {
    const { user } = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const ev = await createEvent(String(user._id), sample)
    expect(ev.status).toBe('pending')
    expect(String(ev.organizer)).toBe(String(user._id))
    expect(ev.registeredCount).toBe(0)
  })
  it('owner can update, non-owner cannot', async () => {
    const a = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const b = await registerUser({ name: 'B', email: 'b@x.com', password: 'password1' })
    const ev = await createEvent(String(a.user._id), sample)
    const upd = await updateEvent(ev._id, { role: 'user', userId: String(a.user._id) }, { title: 'New' })
    expect(upd.title).toBe('New')
    await expect(updateEvent(ev._id, { role: 'user', userId: String(b.user._id) }, { title: 'X' }))
      .rejects.toMatchObject({ status: 403 })
  })
  it('admin can delete any event', async () => {
    const a = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const ev = await createEvent(String(a.user._id), sample)
    await deleteEvent(ev._id, { role: 'admin', userId: 'someone' })
    expect(await getEvent(ev._id, null)).toBeNull()
  })
  it('public getEvent hides non-published, owner sees own', async () => {
    const a = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const ev = await createEvent(String(a.user._id), sample)
    expect(await getEvent(ev._id, null)).toBeNull()
    expect(await getEvent(ev._id, { role: 'user', userId: String(a.user._id) })).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/lib/services/events.ts`** (CRUD portion)

```ts
import { dbConnect } from '@/lib/db'
import { Event } from '@/lib/models/Event'
import { ServiceError } from './errors'
import type { CreateEventInput } from '@/lib/validation/event'

export type Actor = { userId: string; role: 'user' | 'admin' }

function toObj(ev: any) {
  return { ...ev.toObject(), _id: String(ev._id), organizer: String(ev.organizer) }
}

export async function createEvent(userId: string, input: CreateEventInput) {
  await dbConnect()
  const ev = await Event.create({ ...input, organizer: userId, status: 'pending', registeredCount: 0 })
  return toObj(ev)
}

export async function getEvent(id: string, actor: Actor | null) {
  await dbConnect()
  const ev = await Event.findById(id).catch(() => null)
  if (!ev) return null
  if (ev.status === 'published') return toObj(ev)
  if (actor && (actor.role === 'admin' || String(ev.organizer) === actor.userId)) return toObj(ev)
  return null
}

function assertCanEdit(ev: any, actor: Actor) {
  if (actor.role !== 'admin' && String(ev.organizer) !== actor.userId) {
    throw new ServiceError(403, 'Not allowed')
  }
}

export async function updateEvent(id: string, actor: Actor, patch: Partial<CreateEventInput>) {
  await dbConnect()
  const ev = await Event.findById(id)
  if (!ev) throw new ServiceError(404, 'Event not found')
  assertCanEdit(ev, actor)
  Object.assign(ev, patch)
  await ev.save()
  return toObj(ev)
}

export async function deleteEvent(id: string, actor: Actor) {
  await dbConnect()
  const ev = await Event.findById(id)
  if (!ev) throw new ServiceError(404, 'Event not found')
  assertCanEdit(ev, actor)
  await ev.deleteOne()
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add event service CRUD"`

### Task 6.2: listEvents (search/filter/paginate) + home feeds

**Files:** Modify `src/lib/services/events.ts` (append), Test `tests/services/events-list.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent, listEvents, homeFeeds } from '@/lib/services/events'
import { Event } from '@/lib/models/Event'

async function publishedEvent(owner: string, over: Partial<any> = {}) {
  const ev = await createEvent(owner, { title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'), time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0, ...over })
  await Event.findByIdAndUpdate(ev._id, { status: 'published', ...over })
  return ev
}

describe('listEvents + feeds', () => {
  let owner: string
  beforeEach(async () => { owner = String((await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })).user._id) })

  it('returns only published, paginated', async () => {
    await publishedEvent(owner, { title: 'Pub' })
    await createEvent(owner, { title: 'Draft', description: 'D', category: 'Tech', date: new Date('2030-01-01'), time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0 })
    const res = await listEvents({ page: 1, limit: 9 } as any)
    expect(res.total).toBe(1)
    expect(res.items[0].title).toBe('Pub')
  })
  it('filters by category and free/paid', async () => {
    await publishedEvent(owner, { title: 'Free', category: 'Music', price: 0 })
    await publishedEvent(owner, { title: 'Paid', category: 'Music', price: 20 })
    const paid = await listEvents({ page: 1, limit: 9, category: 'Music', price: 'paid' } as any)
    expect(paid.total).toBe(1)
    expect(paid.items[0].title).toBe('Paid')
  })
  it('homeFeeds returns featured/popular/upcoming arrays', async () => {
    await publishedEvent(owner, { title: 'Feat', isFeatured: true })
    const feeds = await homeFeeds()
    expect(feeds.featured.length).toBe(1)
    expect(Array.isArray(feeds.popular)).toBe(true)
    expect(Array.isArray(feeds.upcoming)).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement (append to `src/lib/services/events.ts`)**

```ts
import type { ListQuery } from '@/lib/validation/query'

export async function listEvents(q: ListQuery) {
  await dbConnect()
  const filter: Record<string, any> = { status: 'published' }
  if (q.search) filter.$text = { $search: q.search }
  if (q.category) filter.category = q.category
  if (q.city) filter.city = q.city
  if (q.price === 'free') filter.price = 0
  if (q.price === 'paid') filter.price = { $gt: 0 }
  const now = new Date()
  if (q.when === 'upcoming') filter.date = { ...(filter.date ?? {}), $gte: now }
  if (q.when === 'past') filter.date = { ...(filter.date ?? {}), $lt: now }
  if (q.from) filter.date = { ...(filter.date ?? {}), $gte: q.from }
  if (q.to) filter.date = { ...(filter.date ?? {}), $lte: q.to }

  const skip = (q.page - 1) * q.limit
  const [docs, total] = await Promise.all([
    Event.find(filter).sort({ date: 1 }).skip(skip).limit(q.limit),
    Event.countDocuments(filter),
  ])
  return {
    items: docs.map((d) => ({ ...d.toObject(), _id: String(d._id), organizer: String(d.organizer) })),
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
  }
}

export async function homeFeeds() {
  await dbConnect()
  const now = new Date()
  const map = (d: any) => ({ ...d.toObject(), _id: String(d._id), organizer: String(d.organizer) })
  const [featured, popular, upcoming] = await Promise.all([
    Event.find({ status: 'published', isFeatured: true }).sort({ date: 1 }).limit(6),
    Event.find({ status: 'published' }).sort({ registeredCount: -1 }).limit(6),
    Event.find({ status: 'published', date: { $gte: now } }).sort({ date: 1 }).limit(6),
  ])
  return { featured: featured.map(map), popular: popular.map(map), upcoming: upcoming.map(map) }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add event listing, filters, and home feeds"`

### Task 6.3: moderateEvent + admin listing

**Files:** Modify `src/lib/services/events.ts` (append), Test `tests/services/events-moderate.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent, moderateEvent, listByStatus, getEvent } from '@/lib/services/events'

const sample = { title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'), time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0 }

describe('moderation', () => {
  it('approve publishes and makes it public', async () => {
    const a = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const ev = await createEvent(String(a.user._id), sample)
    const moderated = await moderateEvent(ev._id, { action: 'approve', isFeatured: true })
    expect(moderated.status).toBe('published')
    expect(moderated.isFeatured).toBe(true)
    expect(await getEvent(ev._id, null)).not.toBeNull()
  })
  it('reject keeps it hidden from public', async () => {
    const a = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const ev = await createEvent(String(a.user._id), sample)
    await moderateEvent(ev._id, { action: 'reject' })
    expect(await getEvent(ev._id, null)).toBeNull()
  })
  it('listByStatus filters', async () => {
    const a = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    await createEvent(String(a.user._id), sample)
    const pending = await listByStatus('pending')
    expect(pending.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement (append to `src/lib/services/events.ts`)**

```ts
import type { z } from 'zod'
import type { moderateSchema } from '@/lib/validation/event'

export async function moderateEvent(id: string, input: z.infer<typeof moderateSchema>) {
  await dbConnect()
  const ev = await Event.findById(id)
  if (!ev) throw new ServiceError(404, 'Event not found')
  ev.status = input.action === 'approve' ? 'published' : 'rejected'
  if (typeof input.isFeatured === 'boolean') ev.isFeatured = input.isFeatured
  await ev.save()
  return toObj(ev)
}

export async function listByStatus(status?: 'pending' | 'published' | 'rejected') {
  await dbConnect()
  const filter = status ? { status } : {}
  const docs = await Event.find(filter).sort({ createdAt: -1 })
  return docs.map((d) => ({ ...d.toObject(), _id: String(d._id), organizer: String(d.organizer) }))
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add event moderation and admin listing"`

---

## Phase 7 — Registration service (core correctness)

### Task 7.1: registerForEvent with capacity + duplicate rules

**Files:** Create `src/lib/services/registrations.ts`, Test `tests/services/registrations.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent } from '@/lib/services/events'
import { Event } from '@/lib/models/Event'
import { registerForEvent, cancelRegistration, myTickets } from '@/lib/services/registrations'

vi.mock('@/lib/email', () => ({ sendConfirmationEmail: vi.fn().mockResolvedValue(undefined) }))

async function publishedEvent(owner: string, over: Partial<any> = {}) {
  const ev = await createEvent(owner, { title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'), time: '10:00', venue: 'Hall', city: 'NYC', capacity: 2, price: 0, ...over })
  await Event.findByIdAndUpdate(ev._id, { status: 'published' })
  return ev
}

describe('registerForEvent', () => {
  let uId: string, oId: string
  beforeEach(async () => {
    oId = String((await registerUser({ name: 'O', email: 'o@x.com', password: 'password1' })).user._id)
    uId = String((await registerUser({ name: 'U', email: 'u@x.com', password: 'password1' })).user._id)
  })

  it('registers, generates ticket, increments count, sends email', async () => {
    const { sendConfirmationEmail } = await import('@/lib/email')
    const ev = await publishedEvent(oId)
    const reg = await registerForEvent(ev._id, uId)
    expect(reg.ticketNumber).toMatch(/^EVT-/)
    const fresh = await Event.findById(ev._id)
    expect(fresh!.registeredCount).toBe(1)
    expect(sendConfirmationEmail).toHaveBeenCalledOnce()
  })

  it('blocks duplicate registration (409)', async () => {
    const ev = await publishedEvent(oId)
    await registerForEvent(ev._id, uId)
    await expect(registerForEvent(ev._id, uId)).rejects.toMatchObject({ status: 409 })
  })

  it('blocks when full — no oversell (409)', async () => {
    const ev = await publishedEvent(oId, { capacity: 1 })
    const u2 = String((await registerUser({ name: 'U2', email: 'u2@x.com', password: 'password1' })).user._id)
    await registerForEvent(ev._id, uId)
    await expect(registerForEvent(ev._id, u2)).rejects.toMatchObject({ status: 409 })
    const fresh = await Event.findById(ev._id)
    expect(fresh!.registeredCount).toBe(1)
  })

  it('blocks unpublished event (409)', async () => {
    const ev = await createEvent(oId, { title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'), time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0 })
    await expect(registerForEvent(ev._id, uId)).rejects.toMatchObject({ status: 409 })
  })

  it('blocks past event (409)', async () => {
    const ev = await publishedEvent(oId, { date: new Date('2000-01-01') })
    await expect(registerForEvent(ev._id, uId)).rejects.toMatchObject({ status: 409 })
  })

  it('cancel frees a seat and lets a new user register', async () => {
    const ev = await publishedEvent(oId, { capacity: 1 })
    const u2 = String((await registerUser({ name: 'U2', email: 'u2@x.com', password: 'password1' })).user._id)
    await registerForEvent(ev._id, uId)
    await cancelRegistration(ev._id, uId)
    expect((await Event.findById(ev._id))!.registeredCount).toBe(0)
    const reg2 = await registerForEvent(ev._id, u2)
    expect(reg2.ticketNumber).toMatch(/^EVT-/)
  })

  it('myTickets returns active registrations with event info', async () => {
    const ev = await publishedEvent(oId)
    await registerForEvent(ev._id, uId)
    const tickets = await myTickets(uId)
    expect(tickets.length).toBe(1)
    expect(tickets[0].event.title).toBe('T')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/lib/services/registrations.ts`**

```ts
import { dbConnect } from '@/lib/db'
import { Event } from '@/lib/models/Event'
import { Registration } from '@/lib/models/Registration'
import { User } from '@/lib/models/User'
import { ServiceError } from './errors'
import { makeTicketNumber } from '@/lib/ticket'
import { sendConfirmationEmail } from '@/lib/email'

export async function registerForEvent(eventId: string, userId: string) {
  await dbConnect()

  const target = await Event.findById(eventId).catch(() => null)
  if (!target) throw new ServiceError(404, 'Event not found')
  if (target.status !== 'published') throw new ServiceError(409, 'Event not open for registration')
  if (new Date(target.date).getTime() < Date.now()) throw new ServiceError(409, 'Event already happened')

  const existing = await Registration.findOne({ user: userId, event: eventId })
  if (existing && existing.status === 'active') throw new ServiceError(409, 'Already registered')

  // Atomic seat claim: only succeeds while registeredCount < capacity.
  const claimed = await Event.findOneAndUpdate(
    { _id: eventId, status: 'published', $expr: { $lt: ['$registeredCount', '$capacity'] } },
    { $inc: { registeredCount: 1 } },
    { new: true },
  )
  if (!claimed) throw new ServiceError(409, 'Event is full')

  const ticketNumber = makeTicketNumber(String(eventId))
  try {
    let reg
    if (existing) {
      existing.status = 'active'
      existing.ticketNumber = ticketNumber
      reg = await existing.save()
    } else {
      reg = await Registration.create({ user: userId, event: eventId, ticketNumber, status: 'active' })
    }
    const user = await User.findById(userId)
    if (user) await sendConfirmationEmail(user.email, { title: claimed.title, date: claimed.date, time: claimed.time, venue: claimed.venue, city: claimed.city, ticketNumber })
    return { _id: String(reg._id), ticketNumber, event: String(eventId), status: reg.status }
  } catch (err: any) {
    // Roll back the seat claim if registration insert failed (e.g., duplicate race).
    await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: -1 } })
    if (err?.code === 11000) throw new ServiceError(409, 'Already registered')
    throw err
  }
}

export async function cancelRegistration(eventId: string, userId: string) {
  await dbConnect()
  const reg = await Registration.findOne({ user: userId, event: eventId, status: 'active' })
  if (!reg) throw new ServiceError(404, 'No active registration')
  reg.status = 'cancelled'
  await reg.save()
  await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: -1 } })
  return { ok: true }
}

export async function myTickets(userId: string) {
  await dbConnect()
  const regs = await Registration.find({ user: userId, status: 'active' }).populate('event').sort({ createdAt: -1 })
  return regs.map((r) => ({
    _id: String(r._id),
    ticketNumber: r.ticketNumber,
    status: r.status,
    event: { ...(r.event as any).toObject(), _id: String((r.event as any)._id) },
  }))
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add registration service with atomic capacity + duplicate guard"`

### Task 7.2: attendees + CSV export

**Files:** Modify `src/lib/services/registrations.ts` (append), Test `tests/services/attendees.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent } from '@/lib/services/events'
import { Event } from '@/lib/models/Event'
import { registerForEvent, listAttendees, attendeesCsv } from '@/lib/services/registrations'

vi.mock('@/lib/email', () => ({ sendConfirmationEmail: vi.fn().mockResolvedValue(undefined) }))

describe('attendees + csv', () => {
  it('lists attendees and builds CSV', async () => {
    const o = String((await registerUser({ name: 'O', email: 'o@x.com', password: 'password1' })).user._id)
    const u = await registerUser({ name: 'Uma', email: 'uma@x.com', password: 'password1' })
    const ev = await createEvent(o, { title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'), time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0 })
    await Event.findByIdAndUpdate(ev._id, { status: 'published' })
    await registerForEvent(ev._id, String(u.user._id))
    const attendees = await listAttendees(ev._id)
    expect(attendees.length).toBe(1)
    expect(attendees[0].name).toBe('Uma')
    const csv = await attendeesCsv(ev._id)
    expect(csv).toContain('name,email,ticketNumber,registeredAt')
    expect(csv).toContain('uma@x.com')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement (append to `src/lib/services/registrations.ts`)**

```ts
export async function listAttendees(eventId: string) {
  await dbConnect()
  const regs = await Registration.find({ event: eventId, status: 'active' }).populate('user').sort({ createdAt: 1 })
  return regs.map((r) => {
    const u = r.user as any
    return { name: u.name, email: u.email, ticketNumber: r.ticketNumber, registeredAt: r.createdAt }
  })
}

function csvCell(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function attendeesCsv(eventId: string): Promise<string> {
  const rows = await listAttendees(eventId)
  const header = 'name,email,ticketNumber,registeredAt'
  const body = rows.map((r) => [r.name, r.email, r.ticketNumber, new Date(r.registeredAt).toISOString()].map(csvCell).join(','))
  return [header, ...body].join('\n')
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add attendee list and CSV export"`

---

## Phase 8 — Email

### Task 8.1: Nodemailer transport (Ethereal dev / SMTP prod)

**Files:** Create `src/lib/email.ts`, Test `tests/email.test.ts`

- [ ] **Step 1: Write failing test** (pure formatting, no network)

```ts
import { describe, it, expect } from 'vitest'
import { renderConfirmation } from '@/lib/email'

describe('renderConfirmation', () => {
  it('includes title and ticket number', () => {
    const { subject, text } = renderConfirmation({ title: 'React Workshop', date: new Date('2030-07-15'), time: '10:00', venue: 'Hall', city: 'NYC', ticketNumber: 'EVT-abc123-XYZ999' })
    expect(subject).toContain('React Workshop')
    expect(text).toContain('EVT-abc123-XYZ999')
    expect(text).toContain('Hall')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/lib/email.ts`**

```ts
import nodemailer, { type Transporter } from 'nodemailer'

export type ConfirmationData = { title: string; date: Date; time: string; venue: string; city: string; ticketNumber: string }

export function renderConfirmation(d: ConfirmationData): { subject: string; text: string; html: string } {
  const when = new Date(d.date).toDateString()
  const subject = `Registration confirmed: ${d.title}`
  const text = `You're registered for ${d.title}.\n\nDate: ${when} ${d.time}\nVenue: ${d.venue}, ${d.city}\nTicket: ${d.ticketNumber}\n\nSee you there!`
  const html = `<h2>You're registered for ${d.title}</h2><p><b>Date:</b> ${when} ${d.time}<br/><b>Venue:</b> ${d.venue}, ${d.city}<br/><b>Ticket:</b> ${d.ticketNumber}</p>`
  return { subject, text, html }
}

let cachedTransport: Transporter | null = null
async function getTransport(): Promise<Transporter> {
  if (cachedTransport) return cachedTransport
  if (process.env.SMTP_HOST) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  } else {
    const test = await nodemailer.createTestAccount()
    cachedTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, auth: { user: test.user, pass: test.pass },
    })
  }
  return cachedTransport
}

export async function sendConfirmationEmail(to: string, data: ConfirmationData): Promise<void> {
  const { subject, text, html } = renderConfirmation(data)
  const transport = await getTransport()
  const info = await transport.sendMail({ from: process.env.EMAIL_FROM ?? 'Events <no-reply@events.test>', to, subject, text, html })
  const preview = nodemailer.getTestMessageUrl(info)
  if (preview) console.log(`[email] preview: ${preview}`)
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add email confirmation (Ethereal dev / SMTP prod)"`

---

## Phase 9 — HTTP helpers, route handlers & middleware

### Task 9.1: HTTP helpers

**Files:** Create `src/lib/http.ts`, Test `tests/http.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { json, handleError } from '@/lib/http'
import { ServiceError } from '@/lib/services/errors'

describe('http helpers', () => {
  it('json sets status + body', async () => {
    const res = json({ a: 1 }, 201)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ a: 1 })
  })
  it('handleError maps ServiceError status', async () => {
    const res = handleError(new ServiceError(409, 'dupe'))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'dupe' })
  })
  it('handleError defaults to 500', async () => {
    const res = handleError(new Error('boom'))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/lib/http.ts`**

```ts
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ServiceError } from './services/errors'

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status })
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) return json({ error: 'Invalid input', details: err.flatten() }, 400)
  if (err instanceof ServiceError) return json({ error: err.message }, err.status)
  console.error(err)
  return json({ error: 'Internal error' }, 500)
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add http json/error helpers"`

### Task 9.2: Request auth helper

**Files:** Modify `src/lib/auth.ts` (append `getActorFromRequest`), Test `tests/actor.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { signToken, getActorFromCookies } from '@/lib/auth'

describe('getActorFromCookies', () => {
  it('reads actor from a cookies-like object', async () => {
    const t = await signToken({ sub: 'u1', role: 'admin' })
    const actor = await getActorFromCookies({ get: (n: string) => (n === 'token' ? { value: t } : undefined) })
    expect(actor).toEqual({ userId: 'u1', role: 'admin' })
    expect(await getActorFromCookies({ get: () => undefined })).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement (append to `src/lib/auth.ts`)**

```ts
type CookieJar = { get(name: string): { value: string } | undefined }

export async function getActorFromCookies(jar: CookieJar): Promise<{ userId: string; role: 'user' | 'admin' } | null> {
  const token = jar.get(AUTH_COOKIE)?.value
  const claims = await currentUserFromToken(token)
  return claims ? { userId: claims.sub, role: claims.role } : null
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add request actor helper"`

### Task 9.3: Auth route handlers

**Files:** Create `src/app/api/auth/register/route.ts`, `login/route.ts`, `logout/route.ts`, `me/route.ts`

> These are thin wrappers. No new logic beyond wiring — covered by service tests. Manual verification via `npm run dev` after Phase 11.

- [ ] **Step 1: `register/route.ts`**

```ts
import { cookies } from 'next/headers'
import { registerSchema } from '@/lib/validation/auth'
import { registerUser } from '@/lib/services/users'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'
import { json, handleError } from '@/lib/http'

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json())
    const { user, claims } = await registerUser(body)
    const token = await signToken(claims)
    ;(await cookies()).set(AUTH_COOKIE, token, cookieOptions)
    return json({ user }, 201)
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 2: `login/route.ts`**

```ts
import { cookies } from 'next/headers'
import { loginSchema } from '@/lib/validation/auth'
import { loginUser } from '@/lib/services/users'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'
import { json, handleError } from '@/lib/http'

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json())
    const { user, claims } = await loginUser(body)
    const token = await signToken(claims)
    ;(await cookies()).set(AUTH_COOKIE, token, cookieOptions)
    return json({ user })
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 3: `logout/route.ts`**

```ts
import { cookies } from 'next/headers'
import { AUTH_COOKIE } from '@/lib/auth'
import { json } from '@/lib/http'

export async function POST() {
  ;(await cookies()).delete(AUTH_COOKIE)
  return json({ ok: true })
}
```

- [ ] **Step 4: `me/route.ts`**

```ts
import { cookies } from 'next/headers'
import { getActorFromCookies } from '@/lib/auth'
import { getUserById, updateProfile } from '@/lib/services/users'
import { updateProfileSchema } from '@/lib/validation/auth'
import { json, handleError } from '@/lib/http'

export async function GET() {
  const actor = await getActorFromCookies(await cookies())
  if (!actor) return json({ user: null })
  return json({ user: await getUserById(actor.userId) })
}

export async function PATCH(req: Request) {
  try {
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    const body = updateProfileSchema.parse(await req.json())
    return json({ user: await updateProfile(actor.userId, body) })
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add auth route handlers"`

### Task 9.4: Event + registration + admin route handlers

**Files:** Create `src/app/api/events/route.ts`, `events/[id]/route.ts`, `events/[id]/register/route.ts`, `me/registrations/route.ts`, `admin/events/route.ts`, `admin/events/[id]/moderate/route.ts`, `admin/events/[id]/attendees/route.ts`, `admin/events/[id]/attendees/export/route.ts`

- [ ] **Step 1: `events/route.ts` (list + create)**

```ts
import { cookies } from 'next/headers'
import { listQuerySchema } from '@/lib/validation/query'
import { createEventSchema } from '@/lib/validation/event'
import { listEvents, createEvent } from '@/lib/services/events'
import { getActorFromCookies } from '@/lib/auth'
import { json, handleError } from '@/lib/http'

export async function GET(req: Request) {
  try {
    const q = listQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams))
    return json(await listEvents(q))
  } catch (err) { return handleError(err) }
}

export async function POST(req: Request) {
  try {
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    const body = createEventSchema.parse(await req.json())
    return json({ event: await createEvent(actor.userId, body) }, 201)
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 2: `events/[id]/route.ts` (get/update/delete)**

```ts
import { cookies } from 'next/headers'
import { updateEventSchema } from '@/lib/validation/event'
import { getEvent, updateEvent, deleteEvent } from '@/lib/services/events'
import { getActorFromCookies } from '@/lib/auth'
import { json, handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const actor = await getActorFromCookies(await cookies())
  const ev = await getEvent(id, actor)
  return ev ? json({ event: ev }) : json({ error: 'Not found' }, 404)
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    const body = updateEventSchema.parse(await req.json())
    return json({ event: await updateEvent(id, actor, body) })
  } catch (err) { return handleError(err) }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    await deleteEvent(id, actor)
    return json({ ok: true })
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 3: `events/[id]/register/route.ts`**

```ts
import { cookies } from 'next/headers'
import { registerForEvent, cancelRegistration } from '@/lib/services/registrations'
import { getActorFromCookies } from '@/lib/auth'
import { json, handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    return json({ registration: await registerForEvent(id, actor.userId) }, 201)
  } catch (err) { return handleError(err) }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    return json(await cancelRegistration(id, actor.userId))
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 4: `me/registrations/route.ts`**

```ts
import { cookies } from 'next/headers'
import { myTickets } from '@/lib/services/registrations'
import { getActorFromCookies } from '@/lib/auth'
import { json } from '@/lib/http'

export async function GET() {
  const actor = await getActorFromCookies(await cookies())
  if (!actor) return json({ error: 'Unauthorized' }, 401)
  return json({ tickets: await myTickets(actor.userId) })
}
```

- [ ] **Step 5: Admin routes — create a shared guard `src/lib/adminGuard.ts`**

```ts
import { cookies } from 'next/headers'
import { getActorFromCookies } from '@/lib/auth'
import { ServiceError } from '@/lib/services/errors'

export async function requireAdmin() {
  const actor = await getActorFromCookies(await cookies())
  if (!actor) throw new ServiceError(401, 'Unauthorized')
  if (actor.role !== 'admin') throw new ServiceError(403, 'Admin only')
  return actor
}
```

- [ ] **Step 6: `admin/events/route.ts`**

```ts
import { listByStatus } from '@/lib/services/events'
import { requireAdmin } from '@/lib/adminGuard'
import { json, handleError } from '@/lib/http'

export async function GET(req: Request) {
  try {
    await requireAdmin()
    const status = new URL(req.url).searchParams.get('status') as any
    return json({ events: await listByStatus(status ?? undefined) })
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 7: `admin/events/[id]/moderate/route.ts`**

```ts
import { moderateSchema } from '@/lib/validation/event'
import { moderateEvent } from '@/lib/services/events'
import { requireAdmin } from '@/lib/adminGuard'
import { json, handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = moderateSchema.parse(await req.json())
    return json({ event: await moderateEvent(id, body) })
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 8: `admin/events/[id]/attendees/route.ts`**

```ts
import { listAttendees } from '@/lib/services/registrations'
import { requireAdmin } from '@/lib/adminGuard'
import { json, handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    return json({ attendees: await listAttendees(id) })
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 9: `admin/events/[id]/attendees/export/route.ts`**

```ts
import { attendeesCsv } from '@/lib/services/registrations'
import { requireAdmin } from '@/lib/adminGuard'
import { handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    const csv = await attendeesCsv(id)
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="attendees-${id}.csv"` },
    })
  } catch (err) { return handleError(err) }
}
```

- [ ] **Step 10: Commit** — `git add -A && git commit -m "feat: add event, registration, and admin route handlers"`

### Task 9.5: Route middleware guards

**Files:** Create `src/middleware.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PROTECTED = ['/dashboard', '/profile', '/events/new', '/admin']
const isProtected = (p: string) => PROTECTED.some((r) => p === r || p.startsWith(r + '/')) || /^\/events\/[^/]+\/edit$/.test(p)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!isProtected(pathname)) return NextResponse.next()
  const token = req.cookies.get('token')?.value
  const claims = token ? await verifyToken(token) : null
  if (!claims) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith('/admin') && claims.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*', '/profile', '/events/new', '/events/:id/edit', '/admin/:path*'] }
```

> Note: `verifyToken` uses `jose`, which runs in the Edge middleware runtime. Server-side handlers re-check auth — middleware is UX only.

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: add route middleware guards"`

---

## Phase 10 — Frontend (shadcn/ui)

> Frontend tasks are verified manually (`npm run dev`) plus RTL smoke tests in Task 10.8. Use a shared `apiFetch` helper and shadcn components. Keep pages as server components where they only read; use client components for forms/interactions.

### Task 10.1: Install shadcn/ui + base components

- [ ] **Step 1: Init shadcn**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input textarea label card badge select dialog table toast sonner tabs
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "chore: add shadcn/ui base components"`

### Task 10.2: API client + auth context

**Files:** Create `src/lib/apiClient.ts`, `src/components/providers/AuthProvider.tsx`

- [ ] **Step 1: `apiClient.ts`**

```ts
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error ?? 'Request failed')
  return data as T
}
```

- [ ] **Step 2: `AuthProvider.tsx`** (client context that loads `/api/auth/me`)

```tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'

type User = { _id: string; name: string; email: string; role: 'user' | 'admin' } | null
const Ctx = createContext<{ user: User; setUser: (u: User) => void; refresh: () => Promise<void> }>({ user: null, setUser: () => {}, refresh: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const refresh = async () => { const { user } = await apiFetch<{ user: User }>('/api/auth/me'); setUser(user) }
  useEffect(() => { void refresh() }, [])
  return <Ctx.Provider value={{ user, setUser, refresh }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
```

- [ ] **Step 3: Wrap `src/app/layout.tsx`** with `AuthProvider` + a top nav bar (links: Home, Events, Dashboard, Admin [if admin], Login/Logout) and `<Toaster />` from sonner.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add api client and auth provider"`

### Task 10.3: Auth pages (login/register/profile)

**Files:** Create `src/app/login/page.tsx`, `register/page.tsx`, `profile/page.tsx` (client components)

- [ ] **Step 1: Login form** — email + password inputs → `POST /api/auth/login` → on success `refresh()` + redirect to `next` param or `/dashboard`. Show error toast on failure. Use shadcn Card/Input/Button.

- [ ] **Step 2: Register form** — name/email/password → `POST /api/auth/register` → refresh + redirect `/dashboard`.

- [ ] **Step 3: Profile form** — prefilled name; optional new password → `PATCH /api/auth/me` → success toast.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add login, register, profile pages"`

### Task 10.4: Event card + home page

**Files:** Create `src/components/EventCard.tsx`, modify `src/app/page.tsx`

- [ ] **Step 1: `EventCard.tsx`** — shadcn Card showing title, category Badge, date, city, "Seats left: capacity - registeredCount", price (Free/`$price`), link to `/events/[id]`.

- [ ] **Step 2: `page.tsx`** (server component) — fetch feeds via `homeFeeds()` directly (server) and render three sections (Featured, Upcoming, Popular) as grids of `EventCard`, plus a search bar linking to `/events?search=`.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: add event card and home page"`

### Task 10.5: Events list page with filters + pagination

**Files:** Create `src/app/events/page.tsx` (server) + `src/components/EventFilters.tsx` (client)

- [ ] **Step 1:** Read `searchParams`, call `listEvents()` server-side, render grid + pagination (prev/next linking with updated `page`). `EventFilters` updates the URL query (search, category, city, when, price) via router push.

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: add events list with filters and pagination"`

### Task 10.6: Event detail + register/cancel

**Files:** Create `src/app/events/[id]/page.tsx` (server) + `src/components/RegisterButton.tsx` (client)

- [ ] **Step 1:** Server page fetches event via `getEvent(id, actor)`; shows full info + seats left + venue/city. `RegisterButton` (client): if logged in and seats left and not past → "Register" (`POST /api/events/:id/register`); if already registered → "Cancel registration" (`DELETE`). Reflect state, toast results, refresh on success. If not logged in → link to `/login?next=/events/:id`.

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: add event detail page with register/cancel"`

### Task 10.7: Create/edit event + dashboard + admin pages

**Files:** Create `src/app/events/new/page.tsx`, `src/app/events/[id]/edit/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/admin/page.tsx` + `src/components/EventForm.tsx`, `src/components/AdminModerationTable.tsx`

- [ ] **Step 1: `EventForm.tsx`** (client) — all event fields (title, description, category Select, date, time, venue, city, capacity, price) → `POST /api/events` (new) or `PATCH /api/events/:id` (edit). On create, toast "Submitted for review" and redirect `/dashboard`.

- [ ] **Step 2: `dashboard/page.tsx`** — Tabs: "My Events" (fetch own events incl. pending/rejected with status badges + edit/delete) and "My Tickets" (`GET /api/me/registrations` → ticket cards with ticket number + cancel).

- [ ] **Step 3: `admin/page.tsx`** — Tabs: "Pending" (moderation queue → Approve/Reject buttons calling `PATCH /api/admin/events/:id/moderate`, plus Featured toggle), "All Events" (table with counts `registeredCount/capacity`), and per-event "Attendees" dialog (`GET .../attendees`) with a "Download CSV" link to `.../attendees/export`.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add create/edit event, dashboard, admin pages"`

### Task 10.8: Component smoke tests

**Files:** Create `tests/components/EventCard.test.tsx`, add jsdom env

- [ ] **Step 1: Install RTL**

```bash
npm i -D @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Write test** (uses `// @vitest-environment jsdom` pragma)

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EventCard } from '@/components/EventCard'

describe('EventCard', () => {
  it('shows title and seats left', () => {
    render(<EventCard event={{ _id: '1', title: 'React Workshop', category: 'Tech', date: new Date('2030-07-15').toISOString(), city: 'NYC', capacity: 100, registeredCount: 20, price: 0 } as any} />)
    expect(screen.getByText('React Workshop')).toBeTruthy()
    expect(screen.getByText(/80/)).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run — expect PASS** (`npx vitest run tests/components/EventCard.test.tsx`)

- [ ] **Step 4: Commit** — `git add -A && git commit -m "test: add EventCard smoke test"`

---

## Phase 11 — Seed, verification, polish

### Task 11.1: Seed script

**Files:** Create `src/scripts/seed.ts`

- [ ] **Step 1: Implement**

```ts
import 'dotenv/config'
import { dbConnect } from '@/lib/db'
import { User } from '@/lib/models/User'
import { Event } from '@/lib/models/Event'
import { hashPassword } from '@/lib/auth'
import mongoose from 'mongoose'

async function main() {
  await dbConnect()
  const email = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase()
  let admin = await User.findOne({ email })
  if (!admin) {
    admin = await User.create({ name: 'Admin', email, passwordHash: await hashPassword(process.env.ADMIN_PASSWORD ?? 'admin12345'), role: 'admin' })
  }
  const count = await Event.countDocuments()
  if (count === 0) {
    await Event.create([
      { title: 'Tech Conference', description: 'Annual tech conf', category: 'Technology', date: new Date(Date.now() + 6e8), time: '09:00', venue: 'Convention Center', city: 'New York', capacity: 120, price: 0, status: 'published', isFeatured: true, organizer: admin._id },
      { title: 'Music Festival', description: 'Live music', category: 'Music', date: new Date(Date.now() + 12e8), time: '18:00', venue: 'Open Grounds', city: 'London', capacity: 80, price: 25, status: 'published', organizer: admin._id },
    ])
  }
  console.log('Seed complete. Admin:', email)
  await mongoose.disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
```

Note: `tsx` + `tsconfig` path alias `@/*` must resolve. If `tsx` doesn't honor the alias, add `tsconfig-paths` or use a relative import in this script.

- [ ] **Step 2: Run seed** — `npm run seed` → expect "Seed complete."

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: add seed script"`

### Task 11.2: Full test + manual verification

- [ ] **Step 1: Full suite** — `npm run test` → all green.

- [ ] **Step 2: Lint/build** — `npm run build` → succeeds (no type errors).

- [ ] **Step 3: Manual walk-through** (`npm run dev`), verify:
  - Register user → redirected to dashboard.
  - Create event → appears in dashboard as "pending", NOT on `/events`.
  - Log in as admin (seeded) → `/admin` shows pending event → Approve → now public on `/events` and home.
  - Register for event → seats-left drops, confirmation email preview URL printed in server console, ticket appears under "My Tickets".
  - Try registering again → blocked (already registered).
  - Fill an event to capacity → next registration blocked (full).
  - Admin → Attendees → Download CSV → file contains the attendee.

- [ ] **Step 4: README** — Create `README.md` documenting setup, env vars, `npm run seed`, admin login, and the dev email preview behavior.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "docs: add README and finalize MVP+Admin"`

---

## Self-Review

**Spec coverage:**
- Auth (register/login/logout/profile) → Tasks 3.x, 5.1, 9.3, 10.3 ✓
- User-created events default pending → Task 6.1 ✓
- Admin moderation (approve/reject/featured) → Tasks 6.3, 9.4, 10.7 ✓
- Public browse: home feeds, list, search/filter, pagination, detail → Tasks 6.2, 10.4–10.6 ✓
- Registration: seat limit (atomic), duplicate block, ticket #, email, cancel, my tickets → Tasks 7.1, 8.1 ✓
- Admin attendees + CSV export → Tasks 7.2, 9.4 ✓
- Authz (middleware + server re-check; owner/admin edit) → Tasks 6.1, 9.5 ✓
- Responsive/mobile → shadcn/Tailwind (Task 10.x) ✓
- Testing (auth, capacity oversell, duplicate, moderation gate, authz, cancel) → Tasks 5.1, 6.x, 7.x ✓
- Env vars, seed/admin bootstrap → Tasks 0.7, 5.1 (auto-promote), 11.1 ✓

**Placeholder scan:** Frontend Tasks 10.3–10.7 describe components at prose level (fields + endpoints + behavior) rather than full JSX — acceptable because each names exact files, exact endpoints, exact fields, and exact behaviors; the tested/correctness-critical code (services, handlers, atomic capacity) has full code. No "TODO/handle edge cases" left.

**Type consistency:** `Actor = { userId, role }` used consistently across events service, registrations, handlers, adminGuard. `getActorFromCookies`/`requireAdmin` return the same shape. `ServiceError(status,message)` used everywhere and mapped by `handleError`. Ticket format `EVT-<6>-<6>` matches test regex. Cookie name `'token'` matches middleware, `AUTH_COOKIE`, and test.

---

## Execution Handoff

Ready to execute Phase 0 → 11 in order.
