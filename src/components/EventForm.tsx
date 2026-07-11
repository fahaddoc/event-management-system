'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { ClientEvent } from '@/lib/types'

type Props =
  | { mode: 'create'; event?: undefined }
  | { mode: 'edit'; event: ClientEvent }

function toDateInput(d: string | Date | undefined): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

export function EventForm(props: Props) {
  const router = useRouter()
  const e = props.mode === 'edit' ? props.event : undefined
  const [form, setForm] = useState({
    title: e?.title ?? '',
    description: e?.description ?? '',
    category: e?.category ?? '',
    date: toDateInput(e?.date),
    time: e?.time ?? '',
    venue: e?.venue ?? '',
    city: e?.city ?? '',
    capacity: e?.capacity != null ? String(e.capacity) : '',
    price: e?.price != null ? String(e.price) : '0',
  })
  const [busy, setBusy] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setBusy(true)
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        price: Number(form.price || 0),
      }
      if (props.mode === 'create') {
        await apiFetch('/api/events', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Event submitted for review')
      } else {
        await apiFetch(`/api/events/${props.event._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        toast.success('Event updated')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event name</Label>
            <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Technology" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" value={form.venue} onChange={(e) => set('venue', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min={1} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (0 = free)</Label>
              <Input id="price" type="number" min={0} step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving...' : props.mode === 'create' ? 'Create event' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
