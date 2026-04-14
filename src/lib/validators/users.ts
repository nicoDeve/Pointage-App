import { z } from 'zod'

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional().nullable(),
  poste: z.string().min(1).max(200).optional(),
  leaveQuota: z.coerce.number().min(0).max(365).optional(),
  roles: z
    .array(z.enum(['collaborateur', 'validateur', 'support', 'admin']))
    .min(1)
    .optional(),
  imageUrl: z.string().url().optional().nullable(),
})

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})
