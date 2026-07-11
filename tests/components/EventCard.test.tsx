// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EventCard } from '@/components/EventCard'
import type { ClientEvent } from '@/lib/types'

const event: ClientEvent = {
  _id: '1',
  title: 'React Workshop',
  description: 'Learn React',
  category: 'Tech',
  date: new Date('2030-07-15').toISOString(),
  time: '10:00',
  venue: 'Hall',
  city: 'NYC',
  capacity: 100,
  registeredCount: 20,
  price: 0,
  isFeatured: false,
  status: 'published',
  organizer: 'org1',
  createdAt: new Date('2030-01-01').toISOString(),
}

describe('EventCard', () => {
  it('shows title and seats left', () => {
    render(<EventCard event={event} />)
    expect(screen.getByText('React Workshop')).toBeTruthy()
    expect(screen.getByText(/80/)).toBeTruthy()
  })
})
