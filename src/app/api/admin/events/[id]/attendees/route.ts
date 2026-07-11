import { listAttendees } from '@/lib/services/registrations'
import { requireAdmin } from '@/lib/adminGuard'
import { json, handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    return json({ attendees: await listAttendees(id) })
  } catch (err) {
    return handleError(err)
  }
}
