import { cookies } from 'next/headers'
import { updateEventSchema } from '@/lib/validation/event'
import { getEvent, updateEvent, deleteEvent } from '@/lib/services/events'
import { getActorFromCookies } from '@/lib/jwt'
import { json, handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const actor = await getActorFromCookies(await cookies())
  const ev = await getEvent(id, actor)
  return ev ? json({ event: ev }) : json({ error: 'Not found' }, 404)
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    const body = updateEventSchema.parse(await req.json())
    return json({ event: await updateEvent(id, actor, body) })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    await deleteEvent(id, actor)
    return json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
