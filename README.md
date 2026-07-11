# Eventful — Event Management System

Full-stack event management app: users create events (admin-moderated), browse and
search published events, and register with seat limits, duplicate prevention, and
emailed ticket confirmations. Admins moderate events, view attendees, and export CSV.

Built with **Next.js 16 (App Router)**, **MongoDB/Mongoose**, **shadcn/ui**, JWT (httpOnly
cookie) auth, and **Nodemailer** (Ethereal in dev).

## Features

- Auth: register / login / logout / update profile (JWT + bcrypt, httpOnly cookie).
- Any logged-in user creates events → `pending` → admin approves (`published`) or rejects.
- Public browse: home feeds (featured / upcoming / popular), list with search + filters
  (category, city, date range, upcoming/past, free/paid) + pagination, event detail.
- Registration: atomic seat limit (no oversell), no duplicates, ticket number,
  confirmation email, cancel, "My Tickets".
- Admin dashboard: moderation queue, all-events table, per-event attendee list, CSV export.
- Responsive UI (Tailwind + shadcn/ui).

## Prerequisites

- Node.js 20+
- A MongoDB instance (local `mongod`, or MongoDB Atlas)

## Setup

```bash
npm install
cp .env.local.example .env.local   # if present; otherwise create .env.local (see below)
```

`.env.local`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/event_management
JWT_SECRET=change-me-in-prod
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin12345
EMAIL_FROM="Events <no-reply@events.test>"
# Production SMTP (optional; dev uses an Ethereal test inbox when unset):
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
```

Seed an admin user (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`) and a couple of sample events:

```bash
npm run seed
```

Any user who later registers with the `ADMIN_EMAIL` address is auto-promoted to admin.

## Run

```bash
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

## Email in development

When no `SMTP_*` vars are set, Nodemailer uses an auto-created **Ethereal** test account.
On each registration the server logs a preview URL:

```
[email] preview: https://ethereal.email/message/...
```

Open it to see the confirmation email. Email sending is best-effort — a mail failure never
blocks a registration.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run seed` | Create admin + sample events |
| `npm test` | Run Vitest suite (uses in-memory MongoDB) |
| `npm run test:watch` | Watch mode |
| `npm run lint` | ESLint |

## Testing

Business logic lives in a testable service layer (`src/lib/services/*`); route handlers
are thin wrappers. Tests run against an in-memory MongoDB (`mongodb-memory-server`) and
cover auth, event CRUD + authz, published-only listing, moderation gate, atomic capacity
(oversell blocked), duplicate registration, cancel, and CSV export.

```bash
npm test
```

## Architecture

```
src/
  lib/
    db.ts, env.ts, jwt.ts, password.ts, auth.ts, email.ts, ticket.ts, http.ts
    models/       User, Event, Registration
    validation/   Zod schemas (auth, event, query)
    services/     users, events, registrations  (business logic — unit tested)
  app/
    api/**        route handlers (thin: validate → service → json)
    (pages)       home, events, events/[id], events/new, events/[id]/edit,
                  login, register, profile, dashboard, admin
  proxy.ts        route guard (Next 16 proxy convention): protects
                  /dashboard, /profile, /events/new, /events/[id]/edit, /admin
```

## Deploy

- App: Vercel (set the env vars above in the project settings; add real `SMTP_*`).
- Database: MongoDB Atlas (put its URI in `MONGODB_URI`).

## Out of scope (future work)

QR-code tickets, reminder/scheduled emails, real-time attendee counts (WebSockets), PWA,
push notifications, AI recommendations, and payment processing (a `price` field exists but
there is no payment gateway).
