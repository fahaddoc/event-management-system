import { SignJWT, jwtVerify } from 'jose'
import { env } from './env'

export type Role = 'user' | 'admin'
export type JwtClaims = { sub: string; role: Role }
export type Actor = { userId: string; role: Role }

export const AUTH_COOKIE = 'token'

export const cookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

const secret = () => new TextEncoder().encode(env('JWT_SECRET'))

export async function signToken(claims: JwtClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return { sub: String(payload.sub), role: (payload.role as Role) ?? 'user' }
  } catch {
    return null
  }
}

export async function currentUserFromToken(token: string | undefined): Promise<JwtClaims | null> {
  if (!token) return null
  return verifyToken(token)
}

type CookieJar = { get(name: string): { value: string } | undefined }

export async function getActorFromCookies(jar: CookieJar): Promise<Actor | null> {
  const token = jar.get(AUTH_COOKIE)?.value
  const claims = await currentUserFromToken(token)
  return claims ? { userId: claims.sub, role: claims.role } : null
}
