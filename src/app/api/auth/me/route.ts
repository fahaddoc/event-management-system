import { cookies } from 'next/headers'
import { getActorFromCookies } from '@/lib/jwt'
import { getUserById, updateProfile } from '@/lib/services/users'
import { updateProfileSchema } from '@/lib/validation/auth'
import { json, handleError } from '@/lib/http'

export async function GET() {
  const actor = await getActorFromCookies(await cookies())
  if (!actor) return json({ user: null })
  return json({ user: await getUserById(actor.userId) })
}

export async function PATCH(req: Request) {
  try {
    const actor = await getActorFromCookies(await cookies())
    if (!actor) return json({ error: 'Unauthorized' }, 401)
    const body = updateProfileSchema.parse(await req.json())
    return json({ user: await updateProfile(actor.userId, body) })
  } catch (err) {
    return handleError(err)
  }
}
