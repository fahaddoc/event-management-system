import Link from 'next/link'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatPrice } from '@/lib/format'
import type { ClientEvent } from '@/lib/types'

export function EventCard({ event }: { event: ClientEvent }) {
  const seatsLeft = Math.max(0, event.capacity - event.registeredCount)
  return (
    <Link href={`/events/${event._id}`} className="group block h-full">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{event.category}</Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {formatPrice(event.price)}
            </span>
          </div>
          <CardTitle className="line-clamp-2">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            <span>
              {formatDate(event.date)} · {event.time}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4" />
            <span>
              {event.venue}, {event.city}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex items-center gap-2 text-sm">
            <Users className="size-4" />
            <span>Seats left: {seatsLeft}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
