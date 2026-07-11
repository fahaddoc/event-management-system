import { cookies } from 'next/headers'
import { registerForEvent, cancelRegistration } from '@/lib/services/registrations'
import { getActorFromCookies } from '@/lib/jwt'
import { json, handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    return json({ registration: await registerForEvent(id, actor.userId) }, 201)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    return json(await cancelRegistration(id, actor.userId))
  } catch (err) {
    return handleError(err)
  }
}
