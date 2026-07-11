import { attendeesCsv } from '@/lib/services/registrations'
import { requireAdmin } from '@/lib/adminGuard'
import { handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    const csv = await attendeesCsv(id)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendees-${id}.csv"`,
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
