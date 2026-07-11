import { describe, it, expect } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent, getEvent, updateEvent, deleteEvent } from '@/lib/services/events'

const sample = {
  title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'),
  time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0,
}

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
