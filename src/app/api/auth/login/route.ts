import { cookies } from 'next/headers'
import { loginSchema } from '@/lib/validation/auth'
import { loginUser } from '@/lib/services/users'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/jwt'
import { json, handleError } from '@/lib/http'

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json())
    const { user, claims } = await loginUser(body)
    const token = await signToken(claims)
    ;(await cookies()).set(AUTH_COOKIE, token, cookieOptions)
    return json({ user })
  } catch (err) {
    return handleError(err)
  }
}
