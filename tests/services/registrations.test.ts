import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent } from '@/lib/services/events'
import { Event } from '@/lib/models/Event'
import { registerForEvent, cancelRegistration, myTickets } from '@/lib/services/registrations'

vi.mock('@/lib/email', () => ({ sendConfirmationEmail: vi.fn().mockResolvedValue(undefined) }))

const base = {
  title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'),
  time: '10:00', venue: 'Hall', city: 'NYC', capacity: 2, price: 0,
}

async function publishedEvent(owner: string, over: Record<string, unknown> = {}) {
  const ev = await createEvent(owner, { ...base, ...over } as typeof base)
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
    const ev = await createEvent(oId, { ...base, capacity: 5 })
    await expect(registerForEvent(ev._id, uId)).rejects.toMatchObject({ status: 409 })
  })

  it('blocks past event (409)', async () => {
    const ev = await createEvent(oId, { ...base, date: new Date('2000-01-01') })
    await Event.findByIdAndUpdate(ev._id, { status: 'published' })
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
