'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/apiClient'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import type { Attendee } from '@/lib/types'

export function AttendeesDialog({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loaded, setLoaded] = useState(false)

  async function load(open: boolean) {
    if (!open || loaded) return
    try {
      const { attendees } = await apiFetch<{ attendees: Attendee[] }>(
        `/api/admin/events/${eventId}/attendees`,
      )
      setAttendees(attendees)
      setLoaded(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load attendees')
    }
  }

  return (
    <Dialog onOpenChange={load}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Attendees</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Attendees — {eventTitle}</DialogTitle>
          <DialogDescription>{attendees.length} registered</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-auto">
          {attendees.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No attendees yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((a) => (
                  <TableRow key={a.ticketNumber}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.ticketNumber}</TableCell>
                    <TableCell>{formatDate(a.registeredAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <Button variant="secondary" render={<a href={`/api/admin/events/${eventId}/attendees/export`} />}>
          Download CSV
        </Button>
      </DialogContent>
    </Dialog>
  )
}
