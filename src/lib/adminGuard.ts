import { cookies } from 'next/headers'
import { getActorFromCookies, type Actor } from '@/lib/jwt'
import { ServiceError } from '@/lib/services/errors'

export async function requireAdmin(): Promise<Actor> {
  const actor = await getActorFromCookies(await cookies())
  if (!actor) throw new ServiceError(401, 'Unauthorized')
  if (actor.role !== 'admin') throw new ServiceError(403, 'Admin only')
  return actor
}
