import { describe, it, expect } from 'vitest'
import { signToken, getActorFromCookies } from '@/lib/auth'

describe('getActorFromCookies', () => {
  it('reads actor from a cookies-like object', async () => {
    const t = await signToken({ sub: 'u1', role: 'admin' })
    const actor = await getActorFromCookies({
      get: (n: string) => (n === 'token' ? { value: t } : undefined),
    })
    expect(actor).toEqual({ userId: 'u1', role: 'admin' })
    expect(await getActorFromCookies({ get: () => undefined })).toBeNull()
  })
})
