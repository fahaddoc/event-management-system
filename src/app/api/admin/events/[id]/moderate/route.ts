import { moderateSchema } from '@/lib/validation/event'
import { moderateEvent } from '@/lib/services/events'
import { requireAdmin } from '@/lib/adminGuard'
import { json, handleError } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = moderateSchema.parse(await req.json())
    return json({ event: await moderateEvent(id, body) })
  } catch (err) {
    return handleError(err)
  }
}
