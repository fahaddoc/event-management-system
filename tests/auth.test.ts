import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, signToken, verifyToken } from '@/lib/auth'

describe('auth primitives', () => {
  it('hashes and verifies password', async () => {
    const h = await hashPassword('secret123')
    expect(h).not.toBe('secret123')
    expect(await verifyPassword('secret123', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })
  it('signs and verifies a JWT with sub + role', async () => {
    const token = await signToken({ sub: 'u1', role: 'admin' })
    const payload = await verifyToken(token)
    expect(payload?.sub).toBe('u1')
    expect(payload?.role).toBe('admin')
    expect(await verifyToken('garbage')).toBeNull()
  })
})
