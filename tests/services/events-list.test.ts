import { describe, it, expect, beforeEach } from 'vitest'
import { registerUser } from '@/lib/services/users'
import { createEvent, listEvents, homeFeeds } from '@/lib/services/events'
import { Event } from '@/lib/models/Event'

const base = {
  title: 'T', description: 'D', category: 'Tech', date: new Date('2030-01-01'),
  time: '10:00', venue: 'Hall', city: 'NYC', capacity: 5, price: 0,
}

async function publishedEvent(owner: string, over: Record<string, unknown> = {}) {
  const ev = await createEvent(owner, { ...base, ...over } as typeof base)
  await Event.findByIdAndUpdate(ev._id, { status: 'published', ...over })
  return ev
}

describe('listEvents + feeds', () => {
  let owner: string
  beforeEach(async () => {
    owner = String((await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })).user._id)
  })

  it('returns only published, paginated', async () => {
    await publishedEvent(owner, { title: 'Pub' })
    await createEvent(owner, { ...base, title: 'Draft' })
    const res = await listEvents({ page: 1, limit: 9 })
    expect(res.total).toBe(1)
    expect(res.items[0].title).toBe('Pub')
  })
  it('filters by category and free/paid', async () => {
    await publishedEvent(owner, { title: 'Free', category: 'Music', price: 0 })
    await publishedEvent(owner, { title: 'Paid', category: 'Music', price: 20 })
    const paid = await listEvents({ page: 1, limit: 9, category: 'Music', price: 'paid' })
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
