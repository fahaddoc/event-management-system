import { describe, it, expect } from 'vitest'
import { makeTicketNumber } from '@/lib/ticket'

describe('makeTicketNumber', () => {
  it('formats as EVT-<eventFragment>-<6 alnum> and is unique-ish', () => {
    const a = makeTicketNumber('64b2f0aa11223344aabbccdd')
    const b = makeTicketNumber('64b2f0aa11223344aabbccdd')
    expect(a).toMatch(/^EVT-[a-z0-9]{6}-[A-Z0-9]{6}$/)
    expect(a).not.toBe(b)
  })
})
