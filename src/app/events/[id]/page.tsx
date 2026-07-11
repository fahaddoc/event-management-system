import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import { getEvent } from '@/lib/services/events'
import { getActorFromCookies } from '@/lib/jwt'
import { RegisterButton } from '@/components/RegisterButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatPrice } from '@/lib/format'
import type { ClientEvent } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActorFromCookies(await cookies())
  const raw = await getEvent(id, actor)
  if (!raw) notFound()
  const event = raw as ClientEvent

  const seatsLeft = Math.max(0, event.capacity - event.registeredCount)
  const isPast = new Date(event.date).getTime() < Date.now()
  const canEdit = actor && (actor.role === 'admin' || actor.userId === event.organizer)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{event.category}</Badge>
        {event.status !== 'published' && <Badge variant="outline">{event.status}</Badge>}
        <span className="ml-auto text-lg font-semibold">{formatPrice(event.price)}</span>
      </div>

      <h1 className="text-3xl font-bold">{event.title}</h1>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 py-6 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4" /> {formatDate(event.date)}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4" /> {event.time}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4" /> {event.venue}, {event.city}
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4" /> {seatsLeft} of {event.capacity} seats left
          </div>
        </CardContent>
      </Card>

      <p className="whitespace-pre-line text-muted-foreground">{event.description}</p>

      <div className="flex flex-wrap gap-3">
        {event.status === 'published' ? (
          <RegisterButton eventId={event._id} seatsLeft={seatsLeft} isPast={isPast} />
        ) : (
          <Button disabled variant="outline">
            Not open for registration ({event.status})
          </Button>
        )}
        {canEdit && (
          <Button variant="outline" render={<Link href={`/events/${event._id}/edit`} />}>
            Edit event
          </Button>
        )}
      </div>
    </div>
  )
}
