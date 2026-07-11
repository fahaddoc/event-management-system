import { describe, it, expect } from 'vitest'
import { json, handleError } from '@/lib/http'
import { ServiceError } from '@/lib/services/errors'

describe('http helpers', () => {
  it('json sets status + body', async () => {
    const res = json({ a: 1 }, 201)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ a: 1 })
  })
  it('handleError maps ServiceError status', async () => {
    const res = handleError(new ServiceError(409, 'dupe'))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'dupe' })
  })
  it('handleError defaults to 500', async () => {
    const res = handleError(new Error('boom'))
    expect(res.status).toBe(500)
  })
})
