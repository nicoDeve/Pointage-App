import { z } from 'zod'
import { toDateKey } from '@repo/shared'

export const absenceRequestIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listAbsenceRequestsQuerySchema = z.object({
  status: z.enum(['en_attente', 'approuvee', 'refusee']).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
})

export const createAbsenceRequestSchema = z
  .object({
    type: z.enum(['conges_payes', 'teletravail', 'maladie', 'sans_solde']),
    startDate: z.string().date(),
    endDate: z.string().date(),
    halfDay: z.boolean().optional(),
    comment: z.string().max(500).optional(),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: 'startDate doit être antérieure ou égale à endDate',
    path: ['endDate'],
  })
  .refine((d) => d.startDate >= toDateKey(new Date()), {
    message: 'La date de début ne peut pas être dans le passé',
    path: ['startDate'],
  })

export const rejectAbsenceRequestSchema = z.object({
  rejectReasonCode: z.enum([
    'chevauchement',
    'effectif_insuffisant',
    'delai_non_respecte',
    'autre',
  ]),
  rejectComment: z.string().max(500).optional(),
})
