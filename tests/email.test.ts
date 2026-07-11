import { describe, it, expect } from 'vitest'
import { renderConfirmation } from '@/lib/email'

describe('renderConfirmation', () => {
  it('includes title and ticket number', () => {
    const { subject, text } = renderConfirmation({
      title: 'React Workshop',
      date: new Date('2030-07-15'),
      time: '10:00',
      venue: 'Hall',
      city: 'NYC',
      ticketNumber: 'EVT-abc123-XYZ999',
    })
    expect(subject).toContain('React Workshop')
    expect(text).toContain('EVT-abc123-XYZ999')
    expect(text).toContain('Hall')
  })
})
