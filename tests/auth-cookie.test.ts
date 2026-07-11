import { describe, it, expect } from 'vitest'
import { AUTH_COOKIE, currentUserFromToken, signToken } from '@/lib/auth'

describe('cookie helpers', () => {
  it('exposes cookie name', () => {
    expect(AUTH_COOKIE).toBe('token')
  })
  it('resolves claims from a token string', async () => {
    const t = await signToken({ sub: 'abc', role: 'user' })
    const claims = await currentUserFromToken(t)
    expect(claims?.sub).toBe('abc')
    expect(await currentUserFromToken(undefined)).toBeNull()
  })
})
