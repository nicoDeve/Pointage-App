import type { UserRole, AbsenceType, AbsenceStatus, RejectReasonCode } from './types'

export const USER_ROLES: readonly UserRole[] = [
  'collaborateur',
  'validateur',
  'support',
  'admin',
] as const

/** Labels de rôle pour affichage UI */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  collaborateur: 'Collaborateur',
  validateur: 'Validateur',
  support: 'Support',
  admin: 'Administrateur',
} as const

/** Label par défaut quand le poste n'est pas renseigné */
export const DEFAULT_POSTE_LABEL = 'Collaborateur'

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

/** Motif de rejet utilisé quand un demandeur annule sa propre demande */
export const CANCELLATION_REJECT_REASON: RejectReasonCode = 'autre'
export const CANCELLATION_REJECT_COMMENT = 'Annulée par le demandeur'

// ---------------------------------------------------------------------------
// Constantes de rôles par contexte d'accès
// ---------------------------------------------------------------------------

/** Rôles pouvant accéder à la page Gestion */
export const GESTION_PAGE_ROLES: readonly UserRole[] = ['admin', 'validateur', 'support'] as const

/** Rôles pouvant approuver / refuser des demandes d'absence */
export const ABSENCE_MANAGEMENT_ROLES: readonly UserRole[] = ['admin', 'validateur'] as const

/** Rôles pouvant accéder à la page Support et voir tous les utilisateurs */
export const SUPPORT_PAGE_ROLES: readonly UserRole[] = ['admin', 'support'] as const

/** Rôles pouvant créer des saisies de temps ou des demandes d'absence */
export const ENTRY_CREATION_ROLES: readonly UserRole[] = ['collaborateur', 'admin'] as const

/** Rôles pouvant consulter les absences d'autrui (lecture seule) */
export const ABSENCE_VIEW_ROLES: readonly UserRole[] = ['admin', 'validateur', 'support'] as const

// ---------------------------------------------------------------------------
// Helper de vérification de rôle
// ---------------------------------------------------------------------------

/** Vérifie si au moins un rôle de l'utilisateur figure dans la liste autorisée */
export function hasRole(userRoles: readonly string[], allowed: readonly UserRole[]): boolean {
  return userRoles.some((r) => (allowed as readonly string[]).includes(r))
}

// ---------------------------------------------------------------------------
// Couleurs fallback par projet
// ---------------------------------------------------------------------------

/** Palette de couleurs fallback quand un projet n'a pas de couleur définie */
export const PROJECT_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981'] as const
