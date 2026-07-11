# Event Management System — Design Spec

**Date:** 2026-07-11
**Status:** Approved (design phase)
**Scope tier:** MVP + Admin

## 1. Overview

A full-stack Event Management System. Any registered user can create events; events
stay in a `pending` state until an admin moderates (approves or rejects). Published
events are browsable/searchable by everyone. Logged-in users register for events
(seat-limited, no duplicates), receive a confirmation email with a ticket number, and
can view or cancel their tickets. Admins moderate events, view attendee lists, export
attendees as CSV, and monitor registration counts.

### In scope
- Authentication: register, login, logout, update profile (JWT + bcrypt).
- Event lifecycle: user creates → `pending` → admin approves (`published`) or `rejected`.
- Public browse: home feeds (featured/upcoming/popular), event list with search + filters + pagination, event detail.
- Registration: seat-limited, duplicate-prevented, ticket number, confirmation email, cancel, "my tickets".
- Admin dashboard: moderation queue, manage all events, per-event attendee list, CSV export, registration counts.
- Responsive/mobile via Tailwind.

### Out of scope (future specs)
QR code tickets, reminder/scheduled emails, WebSockets/real-time counts, PWA, push
notifications, AI recommendations, payment processing (a `price` field exists but no
gateway), role-based organizer tiers beyond `user`/`admin`, CI/CD.

## 2. Tech Stack

- **Framework:** Next.js (App Router), full-stack. `/app/api/**` route handlers are the backend.
- **Database:** MongoDB via Mongoose (singleton connection helper).
- **Auth:** Custom JWT + bcrypt. JWT stored in an httpOnly, secure, sameSite cookie.
- **UI:** shadcn/ui components on Tailwind CSS.
- **Email:** Nodemailer. Dev = Ethereal auto test account (preview URL logged). Prod = real SMTP via env vars.
- **Validation:** Zod on all route-handler inputs.
- **Testing:** Vitest (route handler + unit tests), React Testing Library smoke tests.
- **Deploy target:** Vercel (app) + MongoDB Atlas (db).

## 3. Approach Decisions

### 3.1 Registration storage — separate collection (chosen)
`Registration` is its own collection with a unique compound index on `(user, event)`,
giving DB-level duplicate prevention, easy attendee export, and easy "my tickets"
queries. (Rejected: embedding an attendees array in Event — race conditions, unbounded
document growth, weaker atomicity.)

### 3.2 Auth token — httpOnly cookie (chosen)
JWT is set in an httpOnly + secure + sameSite=lax cookie on login/register, verified in
Next.js middleware and re-verified in route handlers. Not readable by JS → no XSS token
theft. (Rejected: localStorage + Bearer header — XSS-exposed.)

### 3.3 Capacity race prevention
Each Event carries a `registeredCount`. Registration performs an atomic guarded update:

```js
const updated = await Event.findOneAndUpdate(
  { _id: eventId, status: 'published', registeredCount: { $lt: capacity } },
  { $inc: { registeredCount: 1 } },
  { new: true }
);
if (!updated) throw new Error('Event full or unavailable');
```

Then insert the `Registration`. The unique `(user, event)` index blocks duplicates even
under concurrency; if insertion fails on duplicate, roll back the `$inc`. Cancellation
sets registration `status = 'cancelled'` and `$inc registeredCount: -1` (only if the
registration was `active`).

## 4. Data Models (Mongoose)

### User
| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| email | String | required, unique, lowercased |
| passwordHash | String | required, bcrypt |
| role | String | enum `user` \| `admin`, default `user` |
| createdAt | Date | default now |

### Event
| Field | Type | Notes |
|-------|------|-------|
| title | String | required |
| description | String | required |
| category | String | required (e.g. Technology, Music) |
| date | Date | required (event date) |
| time | String | required (e.g. "18:00") |
| venue | String | required |
| city | String | required (for city filter) |
| capacity | Number | required, min 1 |
| registeredCount | Number | default 0 |
| price | Number | default 0 (0 = free) |
| isFeatured | Boolean | default false (admin toggle) |
| status | String | enum `pending` \| `published` \| `rejected`, default `pending` |
| organizer | ObjectId → User | required |
| createdAt | Date | default now |

Indexes: `status`, `date`, `category`, `city` (filter performance); text index on
`title`/`description` for search.

### Registration
| Field | Type | Notes |
|-------|------|-------|
| user | ObjectId → User | required |
| event | ObjectId → Event | required |
| ticketNumber | String | required, unique |
| status | String | enum `active` \| `cancelled`, default `active` |
| createdAt | Date | default now |

Index: unique compound `(user, event)`.

Ticket number format: `EVT-<short event id>-<random 6 alnum>` (human-readable, unique).

## 5. API Routes (Route Handlers)

### Auth
- `POST /api/auth/register` — create user, hash password, set cookie. Body: name, email, password.
- `POST /api/auth/login` — verify, set cookie.
- `POST /api/auth/logout` — clear cookie.
- `GET /api/auth/me` — current user (from cookie).
- `PATCH /api/auth/me` — update profile (name, password).

### Events (public + owner)
- `GET /api/events` — published only. Query: `search, category, city, from, to, when(upcoming|past), price(free|paid), page, limit`. Returns paginated list + total.
- `POST /api/events` — logged-in; creates event with `status='pending'`, `organizer=me`.
- `GET /api/events/:id` — single event (published to public; owner/admin can view own non-published).
- `PATCH /api/events/:id` — owner or admin.
- `DELETE /api/events/:id` — owner or admin.

### Registration
- `POST /api/events/:id/register` — logged-in; applies registration rules (§7); sends email.
- `DELETE /api/events/:id/register` — cancel own registration.
- `GET /api/me/registrations` — my tickets (populated with event).

### Admin (role = admin)
- `GET /api/admin/events?status=pending` — moderation queue / all events by status.
- `PATCH /api/admin/events/:id/moderate` — body `{ action: 'approve'|'reject' }` → sets status; optional `isFeatured` toggle here too.
- `GET /api/admin/events/:id/attendees` — attendee list (active registrations + user info).
- `GET /api/admin/events/:id/attendees/export` — CSV download.

All handlers: Zod-validate input, return `{ error }` + proper status on failure.

## 6. Pages (App Router)

- `/` — home: featured, upcoming, popular sections + search bar + category chips.
- `/events` — full list with filter controls + pagination.
- `/events/[id]` — detail: full info, venue/city, seats left, register/cancel button.
- `/login`, `/register` — auth forms.
- `/profile` — update name/password.
- `/dashboard` — user home: "My events" (created, with status badges) + "My tickets".
- `/events/new` — create event form.
- `/events/[id]/edit` — edit own event (owner or admin).
- `/admin` — moderation queue, all-events table, per-event attendees view + CSV export button, registration counts.

Middleware guards `/dashboard`, `/events/new`, `/events/[id]/edit`, `/profile`, `/admin`.
`/admin` additionally requires `role === 'admin'`. Route handlers re-check server-side
(middleware is UX, not the security boundary).

## 7. Registration Rules

A registration succeeds only if all hold:
1. User is logged in.
2. Event `status === 'published'`.
3. Event date is not in the past.
4. `registeredCount < capacity` (enforced atomically, §3.3).
5. No existing `active` registration by this user for this event (unique index).

On success: create Registration with a generated ticket number, send confirmation email
(event title, date, time, venue, city, ticket number; in dev, log the Ethereal preview
URL). On cancel: set `status='cancelled'`, decrement `registeredCount`.

## 8. Home Feeds

- **Featured:** events where `isFeatured === true` and `status==='published'`.
- **Popular:** published events sorted by `registeredCount` desc.
- **Upcoming:** published events with `date >= now` sorted by `date` asc.

## 9. Search & Filter

On `GET /api/events`: text search (title/description), filter by category, city,
date range (`from`/`to`), `upcoming|past`, `free|paid`. Server-side pagination
(`page`, `limit`) returning `{ items, total, page, pages }`.

## 10. Error Handling & Validation

- Zod schemas per route; invalid input → `400 { error }`.
- Auth failures → `401`; authz failures → `403`; not found → `404`; conflict
  (duplicate reg / full event) → `409`.
- Client surfaces errors via shadcn toast.
- Mongoose connection wrapped in a cached singleton to survive hot reload / serverless.

## 11. Seeding & Admin Bootstrap

A `seed` script creates an admin user from env `ADMIN_EMAIL` / `ADMIN_PASSWORD` (or
auto-promotes a user whose email matches `ADMIN_EMAIL` on register). Optionally seeds a
few sample published events for local dev.

## 12. Testing Strategy

Route-handler / integration tests (Vitest, against an in-memory or test MongoDB):
- Auth: register, login, wrong password, duplicate email.
- Event creation defaults to `pending`; public `GET /api/events` hides non-published.
- Moderation: approve makes event public; reject keeps it hidden.
- Capacity: N+1th registration for capacity N is rejected (no oversell).
- Duplicate registration blocked.
- Authz: non-admin blocked from admin routes; non-owner blocked from editing others' events.
- Cancel decrements count and frees a seat.

Component smoke tests (RTL): home renders feeds, event detail register button states,
create-event form validation, admin table renders.

## 13. Environment Variables

```
MONGODB_URI=
JWT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
SMTP_HOST=          # prod
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
# dev uses Ethereal auto-created account when SMTP_* unset
```

## 14. Build Order (for the implementation plan)

1. Project scaffold: Next.js + Tailwind + shadcn/ui + Mongoose connection + env.
2. Models + Zod schemas.
3. Auth (routes + cookie/JWT + middleware + pages).
4. Event CRUD (routes + create/edit pages) with `pending` default.
5. Public browse: list + filters + pagination + home feeds + detail page.
6. Registration + capacity + duplicate rules + ticket number.
7. Email confirmation (Nodemailer + Ethereal).
8. Admin dashboard: moderation, attendees, CSV export, counts.
9. Seed script.
10. Tests across the above.
11. Responsive polish + deploy config.
