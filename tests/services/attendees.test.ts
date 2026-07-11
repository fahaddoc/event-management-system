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
    const ev = await createEvent(o, {
      title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'),
      time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0,
    })
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
