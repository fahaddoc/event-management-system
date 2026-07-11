import { listByStatus } from '@/lib/services/events'
import { requireAdmin } from '@/lib/adminGuard'
import { json, handleError } from '@/lib/http'

type Status = 'pending' | 'published' | 'rejected'

export async function GET(req: Request) {
  try {
    await requireAdmin()
    const raw = new URL(req.url).searchParams.get('status')
    const status = (['pending', 'published', 'rejected'] as const).includes(raw as Status)
      ? (raw as Status)
      : undefined
    return json({ events: await listByStatus(status) })
  } catch (err) {
    return handleError(err)
  }
}
