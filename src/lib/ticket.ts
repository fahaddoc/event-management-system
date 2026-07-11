import { randomBytes } from 'node:crypto'

export function makeTicketNumber(eventId: string): string {
  const frag = eventId.slice(-6).toLowerCase()
  const rand = randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
  return `EVT-${frag}-${rand}`
}
