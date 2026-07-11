import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getEvent } from '@/lib/services/events'
import { getActorFromCookies } from '@/lib/jwt'
import { EventForm } from '@/components/EventForm'
import type { ClientEvent } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActorFromCookies(await cookies())
  const raw = await getEvent(id, actor)
  if (!raw) notFound()
  const event = raw as ClientEvent

  const canEdit = actor && (actor.role === 'admin' || actor.userId === event.organizer)
  if (!canEdit) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Edit event</h1>
      <EventForm mode="edit" event={event} />
    </div>
  )
}
