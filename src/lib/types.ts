export type EventStatus = 'pending' | 'published' | 'rejected'

export type ClientEvent = {
  _id: string
  title: string
  description: string
  category: string
  date: string | Date
  time: string
  venue: string
  city: string
  capacity: number
  registeredCount: number
  price: number
  isFeatured: boolean
  status: EventStatus
  organizer: string
  createdAt: string | Date
}

export type Ticket = {
  _id: string
  ticketNumber: string
  status: 'active' | 'cancelled'
  event: ClientEvent
}

export type Attendee = {
  name: string
  email: string
  ticketNumber: string
  registeredAt: string | Date
}
