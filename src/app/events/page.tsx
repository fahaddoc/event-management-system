import Link from 'next/link'
import { listQuerySchema } from '@/lib/validation/query'
import { listEvents } from '@/lib/services/events'
import { EventCard } from '@/components/EventCard'
import { EventFilters } from '@/components/EventFilters'
import { Button } from '@/components/ui/button'
import type { ClientEvent } from '@/lib/types'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const parsed = listQuerySchema.safeParse(Object.fromEntries(Object.entries(sp)))
  const query = parsed.success ? parsed.data : listQuerySchema.parse({})
  const { items, total, page, pages } = await listEvents(query)
  const events = items as ClientEvent[]

  const buildPageLink = (p: number) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
      const val = first(v)
      if (val) q.set(k, val)
    }
    q.set('page', String(p))
    return `/events?${q.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-muted-foreground">{total} published event{total === 1 ? '' : 's'}</p>
      </div>

      <EventFilters
        initial={{
          search: first(sp.search),
          category: first(sp.category),
          city: first(sp.city),
          when: first(sp.when),
          price: first(sp.price),
        }}
      />

      {events.length === 0 ? (
        <p className="text-muted-foreground">No events match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e._id} event={e} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          {page > 1 ? (
            <Button variant="outline" size="sm" render={<Link href={buildPageLink(page - 1)} />}>
              Previous
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Button variant="outline" size="sm" render={<Link href={buildPageLink(page + 1)} />}>
              Next
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
