import Link from 'next/link'
import { Search } from 'lucide-react'
import { homeFeeds } from '@/lib/services/events'
import { EventCard } from '@/components/EventCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ClientEvent } from '@/lib/types'

export const dynamic = 'force-dynamic'

function Section({ title, events }: { title: string; events: ClientEvent[] }) {
  if (events.length === 0) return null
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link href="/events" className="text-sm text-muted-foreground hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <EventCard key={e._id} event={e} />
        ))}
      </div>
    </section>
  )
}

export default async function HomePage() {
  const feeds = (await homeFeeds()) as {
    featured: ClientEvent[]
    popular: ClientEvent[]
    upcoming: ClientEvent[]
  }
  const empty = !feeds.featured.length && !feeds.popular.length && !feeds.upcoming.length

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border bg-muted/30 px-6 py-12 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Discover events near you</h1>
        <p className="mt-3 text-muted-foreground">
          Browse, create, and register for events. Get a ticket in seconds.
        </p>
        <form action="/events" method="get" className="mx-auto mt-6 flex max-w-md gap-2">
          <Input name="search" placeholder="Search events..." aria-label="Search events" />
          <Button type="submit">
            <Search className="size-4" />
            Search
          </Button>
        </form>
      </section>

      <Section title="Featured" events={feeds.featured} />
      <Section title="Upcoming" events={feeds.upcoming} />
      <Section title="Popular" events={feeds.popular} />

      {empty && (
        <p className="text-center text-muted-foreground">
          No published events yet. Run <code>npm run seed</code> or create one.
        </p>
      )}
    </div>
  )
}
