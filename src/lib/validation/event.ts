import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.coerce.date(),
  time: z.string().min(1),
  venue: z.string().min(1),
  city: z.string().min(1),
  capacity: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0).default(0),
})

export const updateEventSchema = createEventSchema.partial()

export const moderateSchema = z.object({
  action: z.enum(['approve', 'reject']),
  isFeatured: z.boolean().optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type ModerateInput = z.infer<typeof moderateSchema>
