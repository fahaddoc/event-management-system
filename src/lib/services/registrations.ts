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
    { returnDocument: 'after' },
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
    if (user) {
      await sendConfirmationEmail(user.email, {
        title: claimed.title,
        date: claimed.date,
        time: claimed.time,
        venue: claimed.venue,
        city: claimed.city,
        ticketNumber,
      })
    }
    return { _id: String(reg._id), ticketNumber, event: String(eventId), status: reg.status }
  } catch (err: unknown) {
    // Roll back the seat claim if the registration insert failed (e.g. duplicate race).
    await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: -1 } })
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
      throw new ServiceError(409, 'Already registered')
    }
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
  const regs = await Registration.find({ user: userId, status: 'active' })
    .populate('event')
    .sort({ createdAt: -1 })
  return regs.map((r) => {
    const ev = r.event as unknown as { _id: unknown; toObject: () => Record<string, unknown> }
    return {
      _id: String(r._id),
      ticketNumber: r.ticketNumber,
      status: r.status,
      event: { ...ev.toObject(), _id: String(ev._id) },
    }
  })
}

export async function listAttendees(eventId: string) {
  await dbConnect()
  const regs = await Registration.find({ event: eventId, status: 'active' })
    .populate('user')
    .sort({ createdAt: 1 })
  return regs.map((r) => {
    const u = r.user as unknown as { name: string; email: string }
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
  const body = rows.map((r) =>
    [r.name, r.email, r.ticketNumber, new Date(r.registeredAt).toISOString()].map(csvCell).join(','),
  )
  return [header, ...body].join('\n')
}
