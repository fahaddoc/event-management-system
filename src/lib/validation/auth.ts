import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.email(),
  password: z.string().min(8).max(100),
})

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8).max(100).optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
