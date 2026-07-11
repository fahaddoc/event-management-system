'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/apiClient'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/format'
import type { ClientEvent, Ticket, EventStatus } from '@/lib/types'

const statusVariant: Record<EventStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  published: 'default',
  pending: 'secondary',
  rejected: 'destructive',
}

export default function DashboardPage() {
  const [events, setEvents] = useState<ClientEvent[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  const load = useCallback(async () => {
    const [{ events }, { tickets }] = await Promise.all([
      apiFetch<{ events: ClientEvent[] }>('/api/me/events'),
      apiFetch<{ tickets: Ticket[] }>('/api/me/registrations'),
    ])
    setEvents(events)
    setTickets(tickets)
  }, [])

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load'))
  }, [load])

  async function deleteEvent(id: string) {
    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' })
      toast.success('Event deleted')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function cancelTicket(eventId: string) {
    try {
      await apiFetch(`/api/events/${eventId}/register`, { method: 'DELETE' })
      toast.success('Registration cancelled')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">My Events ({events.length})</TabsTrigger>
          <TabsTrigger value="tickets">My Tickets ({tickets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Button size="sm" render={<Link href="/events/new" />}>
            Create event
          </Button>
          {events.length === 0 && <p className="text-muted-foreground">No events yet.</p>}
          {events.map((e) => (
            <Card key={e._id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">
                  <Link href={`/events/${e._id}`} className="hover:underline">
                    {e.title}
                  </Link>
                </CardTitle>
                <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {formatDate(e.date)} · {e.registeredCount}/{e.capacity} registered
                </span>
                <span className="flex gap-2">
                  <Button variant="outline" size="sm" render={<Link href={`/events/${e._id}/edit`} />}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteEvent(e._id)}>
                    Delete
                  </Button>
                </span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          {tickets.length === 0 && <p className="text-muted-foreground">No tickets yet.</p>}
          {tickets.map((t) => (
            <Card key={t._id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">
                  <Link href={`/events/${t.event._id}`} className="hover:underline">
                    {t.event.title}
                  </Link>
                </CardTitle>
                <Badge variant="secondary">{t.ticketNumber}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {formatDate(t.event.date)} · {t.event.venue}, {t.event.city}
                </span>
                <Button variant="outline" size="sm" onClick={() => cancelTicket(t.event._id)}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
