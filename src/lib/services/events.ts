import type { HydratedDocument } from 'mongoose'
import { dbConnect } from '@/lib/db'
import { Event, type EventDoc } from '@/lib/models/Event'
import { ServiceError } from './errors'
import type { Actor } from '@/lib/jwt'
import type { CreateEventInput, UpdateEventInput, ModerateInput } from '@/lib/validation/event'
import type { ListQuery } from '@/lib/validation/query'

export type { Actor }

function toObj(ev: HydratedDocument<EventDoc>) {
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

function assertCanEdit(ev: HydratedDocument<EventDoc>, actor: Actor) {
  if (actor.role !== 'admin' && String(ev.organizer) !== actor.userId) {
    throw new ServiceError(403, 'Not allowed')
  }
}

export async function updateEvent(id: string, actor: Actor, patch: UpdateEventInput) {
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

export async function listEvents(q: ListQuery) {
  await dbConnect()
  const filter: Record<string, unknown> = { status: 'published' }
  if (q.search) filter.$text = { $search: q.search }
  if (q.category) filter.category = q.category
  if (q.city) filter.city = q.city
  if (q.price === 'free') filter.price = 0
  if (q.price === 'paid') filter.price = { $gt: 0 }
  const now = new Date()
  const dateFilter: Record<string, Date> = {}
  if (q.when === 'upcoming') dateFilter.$gte = now
  if (q.when === 'past') dateFilter.$lt = now
  if (q.from) dateFilter.$gte = q.from
  if (q.to) dateFilter.$lte = q.to
  if (Object.keys(dateFilter).length) filter.date = dateFilter

  const skip = (q.page - 1) * q.limit
  const [docs, total] = await Promise.all([
    Event.find(filter).sort({ date: 1 }).skip(skip).limit(q.limit),
    Event.countDocuments(filter),
  ])
  return {
    items: docs.map(toObj),
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
  }
}

export async function homeFeeds() {
  await dbConnect()
  const now = new Date()
  const [featured, popular, upcoming] = await Promise.all([
    Event.find({ status: 'published', isFeatured: true }).sort({ date: 1 }).limit(6),
    Event.find({ status: 'published' }).sort({ registeredCount: -1 }).limit(6),
    Event.find({ status: 'published', date: { $gte: now } }).sort({ date: 1 }).limit(6),
  ])
  return { featured: featured.map(toObj), popular: popular.map(toObj), upcoming: upcoming.map(toObj) }
}

export async function moderateEvent(id: string, input: ModerateInput) {
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
  return docs.map(toObj)
}

export async function listByOrganizer(userId: string) {
  await dbConnect()
  const docs = await Event.find({ organizer: userId }).sort({ createdAt: -1 })
  return docs.map(toObj)
}
