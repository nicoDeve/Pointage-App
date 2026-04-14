import { z } from 'zod'

const hexColorRegex = /^#[0-9a-fA-F]{6}$/

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listProjectsQuerySchema = z.object({
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().regex(hexColorRegex, 'Must be a valid hex color (#RRGGBB)'),
  isActive: z.boolean().default(true),
  pole: z.string().min(1).optional(),
  externalSourceId: z.string().min(1).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  color: z
    .string()
    .regex(hexColorRegex, 'Must be a valid hex color (#RRGGBB)')
    .optional(),
  isActive: z.boolean().optional(),
  pole: z.string().min(1).optional().nullable(),
  externalSourceId: z.string().min(1).optional().nullable(),
})

export const syncProjectItemSchema = z.object({
  externalSourceId: z.string().min(1),
  name: z.string().min(1).max(255),
  color: z
    .string()
    .regex(hexColorRegex)
    .optional()
    .default('#6B7280'),
  pole: z.string().min(1).optional(),
  isActive: z.boolean().optional().default(true),
})

export const syncProjectsSchema = z.object({
  projects: z.array(syncProjectItemSchema),
})
