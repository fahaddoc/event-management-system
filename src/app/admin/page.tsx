'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/apiClient'
import { AttendeesDialog } from '@/components/AttendeesDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import type { ClientEvent } from '@/lib/types'

export default function AdminPage() {
  const [pending, setPending] = useState<ClientEvent[]>([])
  const [all, setAll] = useState<ClientEvent[]>([])

  const load = useCallback(async () => {
    const [p, a] = await Promise.all([
      apiFetch<{ events: ClientEvent[] }>('/api/admin/events?status=pending'),
      apiFetch<{ events: ClientEvent[] }>('/api/admin/events'),
    ])
    setPending(p.events)
    setAll(a.events)
  }, [])

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load'))
  }, [load])

  async function moderate(id: string, action: 'approve' | 'reject', isFeatured?: boolean) {
    try {
      await apiFetch(`/api/admin/events/${id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ action, isFeatured }),
      })
      toast.success(action === 'approve' ? 'Event published' : 'Event rejected')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">All events ({all.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pending.length === 0 && <p className="text-muted-foreground">Nothing awaiting review.</p>}
          {pending.map((e) => (
            <Card key={e._id}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Link href={`/events/${e._id}`} className="hover:underline">
                    {e.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {e.category} · {formatDate(e.date)} · {e.city} · cap {e.capacity}
                </span>
                <span className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => moderate(e._id, 'approve')}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => moderate(e._id, 'approve', true)}>
                    Feature &amp; approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => moderate(e._id, 'reject')}>
                    Reject
                  </Button>
                </span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Attendees</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((e) => (
                <TableRow key={e._id}>
                  <TableCell>
                    <Link href={`/events/${e._id}`} className="hover:underline">
                      {e.title}
                    </Link>
                    {e.isFeatured && <Badge className="ml-2" variant="secondary">Featured</Badge>}
                  </TableCell>
                  <TableCell>{e.status}</TableCell>
                  <TableCell>
                    {e.registeredCount}/{e.capacity}
                  </TableCell>
                  <TableCell className="text-right">
                    <AttendeesDialog eventId={e._id} eventTitle={e.title} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {all.length === 0 && <p className="mt-4 text-muted-foreground">No events.</p>}
        </TabsContent>
      </Tabs>
    </div>
  )
}
