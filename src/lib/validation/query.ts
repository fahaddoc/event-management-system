import { z } from 'zod'

export const listQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  when: z.enum(['upcoming', 'past']).optional(),
  price: z.enum(['free', 'paid']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(9),
})

export type ListQuery = z.infer<typeof listQuerySchema>
