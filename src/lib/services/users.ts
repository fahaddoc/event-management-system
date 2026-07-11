import { dbConnect } from '@/lib/db'
import { User } from '@/lib/models/User'
import { hashPassword, verifyPassword } from '@/lib/password'
import type { JwtClaims, Role } from '@/lib/jwt'
import { ServiceError } from './errors'
import type { RegisterInput, LoginInput, UpdateProfileInput } from '@/lib/validation/auth'

export type PublicUser = { _id: string; name: string; email: string; role: Role }

function toPublic(u: {
  _id: unknown
  name: string
  email: string
  role: Role
}): PublicUser {
  return { _id: String(u._id), name: u.name, email: u.email, role: u.role }
}

export async function registerUser(
  input: RegisterInput,
): Promise<{ user: PublicUser; claims: JwtClaims }> {
  await dbConnect()
  const email = input.email.toLowerCase()
  const exists = await User.findOne({ email })
  if (exists) throw new ServiceError(409, 'Email already registered')
  const role: Role = email === (process.env.ADMIN_EMAIL ?? '').toLowerCase() ? 'admin' : 'user'
  const user = await User.create({
    name: input.name,
    email,
    passwordHash: await hashPassword(input.password),
    role,
  })
  return { user: toPublic(user), claims: { sub: String(user._id), role } }
}

export async function loginUser(
  input: LoginInput,
): Promise<{ user: PublicUser; claims: JwtClaims }> {
  await dbConnect()
  const user = await User.findOne({ email: input.email.toLowerCase() })
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ServiceError(401, 'Invalid credentials')
  }
  return { user: toPublic(user), claims: { sub: String(user._id), role: user.role } }
}

export async function updateProfile(
  userId: string,
  patch: UpdateProfileInput,
): Promise<PublicUser> {
  await dbConnect()
  const update: Record<string, unknown> = {}
  if (patch.name) update.name = patch.name
  if (patch.password) update.passwordHash = await hashPassword(patch.password)
  const user = await User.findByIdAndUpdate(userId, update, { returnDocument: 'after' })
  if (!user) throw new ServiceError(404, 'User not found')
  return toPublic(user)
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  await dbConnect()
  const u = await User.findById(userId).catch(() => null)
  return u ? toPublic(u) : null
}
