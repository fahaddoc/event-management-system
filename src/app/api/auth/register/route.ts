import { cookies } from 'next/headers'
import { registerSchema } from '@/lib/validation/auth'
import { registerUser } from '@/lib/services/users'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/jwt'
import { json, handleError } from '@/lib/http'

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json())
    const { user, claims } = await registerUser(body)
    const token = await signToken(claims)
    ;(await cookies()).set(AUTH_COOKIE, token, cookieOptions)
    return json({ user }, 201)
  } catch (err) {
    return handleError(err)
  }
}
