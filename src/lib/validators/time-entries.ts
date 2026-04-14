import { z } from 'zod'
import { MAX_HOURS_PER_DAY, HOURS_STEP } from '@repo/shared'

export const timeEntryIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listTimeEntriesQuerySchema = z.object({
  userId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
})

const durationSchema = z
  .number()
  .positive('La durée doit être positive')
  .max(MAX_HOURS_PER_DAY, `La durée ne peut pas dépasser ${MAX_HOURS_PER_DAY}h`)
  .multipleOf(HOURS_STEP, `La durée doit être un multiple de ${HOURS_STEP}`)

export const createTimeEntrySchema = z.object({
  projectId: z.string().uuid(),
  workDate: z.string().date(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM attendu (00:00–23:59)')
    .optional(),
  duration: durationSchema,
})

export const updateTimeEntrySchema = z.object({
  projectId: z.string().uuid().optional(),
  workDate: z.string().date().optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM attendu (00:00–23:59)')
    .optional()
    .nullable(),
  duration: durationSchema.optional(),
})

export const weekSummaryQuerySchema = z.object({
  userId: z.string().uuid(),
  weekStart: z.string().date(),
})
