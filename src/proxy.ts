import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken, AUTH_COOKIE } from '@/lib/jwt'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(AUTH_COOKIE)?.value
  const claims = token ? await verifyToken(token) : null

  if (!claims) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith('/admin') && claims.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile', '/events/new', '/events/:id/edit', '/admin/:path*'],
}
