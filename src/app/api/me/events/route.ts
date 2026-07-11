import { cookies } from 'next/headers'
import { listByOrganizer } from '@/lib/services/events'
import { getActorFromCookies } from '@/lib/jwt'
import { json } from '@/lib/http'

export async function GET() {
  const actor = await getActorFromCookies(await cookies())
  if (!actor) return json({ error: 'Unauthorized' }, 401)
  return json({ events: await listByOrganizer(actor.userId) })
}
