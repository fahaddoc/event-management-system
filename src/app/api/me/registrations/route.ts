import { cookies } from 'next/headers'
import { myTickets } from '@/lib/services/registrations'
import { getActorFromCookies } from '@/lib/jwt'
import { json } from '@/lib/http'

export async function GET() {
  const actor = await getActorFromCookies(await cookies())
  if (!actor) return json({ error: 'Unauthorized' }, 401)
  return json({ tickets: await myTickets(actor.userId) })
}
