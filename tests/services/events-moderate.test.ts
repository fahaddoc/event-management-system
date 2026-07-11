import { describe, it, expect } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent, moderateEvent, listByStatus, getEvent } from '@/lib/services/events'

const sample = {
  title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'),
  time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0,
}

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
