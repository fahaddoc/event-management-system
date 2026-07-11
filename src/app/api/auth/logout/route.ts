import { cookies } from 'next/headers'
import { AUTH_COOKIE } from '@/lib/jwt'
import { json } from '@/lib/http'

export async function POST() {
  ;(await cookies()).delete(AUTH_COOKIE)
  return json({ ok: true })
}
