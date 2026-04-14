import type {
  User as DbUser,
  Project as DbProject,
  TimeEntry as DbTimeEntry,
  AbsenceRequest as DbAbsenceRequest,
} from '~/db/schema'

/**
 * Convertit les champs Date en string pour correspondre aux réponses JSON API.
 * Les dates Drizzle (timestamp) sont sérialisées en ISO string par JSON.stringify.
 */
type Serialized<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K]
}

export type User = Serialized<DbUser>
export type Project = Serialized<DbProject>
export type TimeEntry = Serialized<DbTimeEntry>
export type AbsenceRequest = Serialized<DbAbsenceRequest>

export type {
  UserRole,
  AbsenceType,
  AbsenceStatus,
  RejectReasonCode,
} from '~/db/schema'
