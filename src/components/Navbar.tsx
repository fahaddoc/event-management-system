'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-5" />
          <span>Eventful</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/events" />}>
            Events
          </Button>
          {!loading && user && (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
                Dashboard
              </Button>
              {user.role === 'admin' && (
                <Button variant="ghost" size="sm" render={<Link href="/admin" />}>
                  Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" render={<Link href="/events/new" />}>
                Create
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
          {!loading && !user && (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                Login
              </Button>
              <Button size="sm" render={<Link href="/register" />}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
