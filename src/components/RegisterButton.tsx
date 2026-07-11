'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/apiClient'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import type { Ticket } from '@/lib/types'

export function RegisterButton({
  eventId,
  seatsLeft,
  isPast,
}: {
  eventId: string
  seatsLeft: number
  isPast: boolean
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [registered, setRegistered] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    if (!user) {
      setRegistered(null)
      return
    }
    apiFetch<{ tickets: Ticket[] }>('/api/me/registrations')
      .then(({ tickets }) => {
        if (active) setRegistered(tickets.some((t) => t.event?._id === eventId))
      })
      .catch(() => active && setRegistered(false))
    return () => {
      active = false
    }
  }, [user, eventId])

  async function register() {
    setBusy(true)
    try {
      await apiFetch(`/api/events/${eventId}/register`, { method: 'POST' })
      setRegistered(true)
      toast.success('Registered! Check your email for the ticket.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    setBusy(true)
    try {
      await apiFetch(`/api/events/${eventId}/register`, { method: 'DELETE' })
      setRegistered(false)
      toast.success('Registration cancelled')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancellation failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Button disabled>Loading...</Button>

  if (!user) {
    return (
      <Button render={<Link href={`/login?next=/events/${eventId}`} />}>Log in to register</Button>
    )
  }

  if (registered) {
    return (
      <Button variant="outline" onClick={cancel} disabled={busy}>
        {busy ? 'Cancelling...' : 'Cancel registration'}
      </Button>
    )
  }

  if (isPast) return <Button disabled>Event ended</Button>
  if (seatsLeft <= 0) return <Button disabled>Sold out</Button>

  return (
    <Button onClick={register} disabled={busy || registered === null}>
      {busy ? 'Registering...' : 'Register'}
    </Button>
  )
}
