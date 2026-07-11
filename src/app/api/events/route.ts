import { cookies } from 'next/headers'
import { listQuerySchema } from '@/lib/validation/query'
import { createEventSchema } from '@/lib/validation/event'
import { listEvents, createEvent } from '@/lib/services/events'
import { getActorFromCookies } from '@/lib/jwt'
import { json, handleError } from '@/lib/http'

export async function GET(req: Request) {
  try {
    const q = listQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams))
    return json(await listEvents(q))
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    const body = createEventSchema.parse(await req.json())
    return json({ event: await createEvent(actor.userId, body) }, 201)
  } catch (err) {
    return handleError(err)
  }
}
