import type { UserRole, AbsenceType, AbsenceStatus, RejectReasonCode } from './types'

export const USER_ROLES: readonly UserRole[] = [
  'collaborateur',
  'validateur',
  'support',
  'admin',
] as const

export const ABSENCE_TYPES: Record<AbsenceType, string> = {
  conges_payes: 'Congés payés',
  teletravail: 'Télétravail',
  maladie: 'Maladie',
  sans_solde: 'Sans solde',
} as const

export const ABSENCE_STATUSES: Record<AbsenceStatus, string> = {
  en_attente: 'En attente',
  approuvee: 'Approuvée',
  refusee: 'Refusée',
} as const

export const REJECT_REASON_CODES: Record<RejectReasonCode, string> = {
  chevauchement: 'Chevauchement',
  effectif_insuffisant: 'Effectif insuffisant',
  delai_non_respecte: 'Délai de prévenance non respecté',
  autre: 'Autre',
} as const

/** Couleurs hex de référence par type d'absence — source unique */
export const ABSENCE_TYPE_COLORS: Record<AbsenceType, string> = {
  conges_payes: '#7c3aed',
  teletravail: '#0284c7',
  maladie: '#dc2626',
  sans_solde: '#6b7280',
} as const

export const AbsenceListFilter = {
  All: 'all',
  EnAttente: 'en_attente',
  Approuvee: 'approuvee',
  Refusee: 'refusee',
} as const
export type AbsenceListFilter =
  (typeof AbsenceListFilter)[keyof typeof AbsenceListFilter]

export const ABSENCE_LIST_FILTER_LABELS: Record<AbsenceListFilter, string> = {
  all: 'Toutes',
  en_attente: 'En attente',
  approuvee: 'Approuvées',
  refusee: 'Refusées',
} as const
