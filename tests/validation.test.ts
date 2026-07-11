import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema } from '@/lib/validation/auth'
import { createEventSchema } from '@/lib/validation/event'
import { listQuerySchema } from '@/lib/validation/query'

describe('validation', () => {
  it('rejects short password', () => {
    expect(registerSchema.safeParse({ name: 'A', email: 'a@b.com', password: '123' }).success).toBe(false)
  })
  it('accepts valid login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'longenough' }).success).toBe(true)
  })
  it('requires capacity >= 1', () => {
    const base = { title: 't', description: 'd', category: 'Tech', date: '2030-01-01', time: '10:00', venue: 'v', city: 'NYC', capacity: 0 }
    expect(createEventSchema.safeParse(base).success).toBe(false)
    expect(createEventSchema.safeParse({ ...base, capacity: 5 }).success).toBe(true)
  })
  it('coerces list query paging with defaults', () => {
    const r = listQuerySchema.parse({})
    expect(r.page).toBe(1)
    expect(r.limit).toBe(9)
  })
})
