import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  date,
  time,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum('user_role', [
  'collaborateur',
  'validateur',
  'support',
  'admin',
])

export const absenceTypeEnum = pgEnum('absence_type', [
  'conges_payes',
  'teletravail',
  'maladie',
  'sans_solde',
])

export const absenceStatusEnum = pgEnum('absence_status', [
  'en_attente',
  'approuvee',
  'refusee',
])

export const rejectReasonCodeEnum = pgEnum('reject_reason_code', [
  'chevauchement',
  'effectif_insuffisant',
  'delai_non_respecte',
  'autre',
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Entra ID oid — provided explicitly, not generated
  name: text('name'), // Display name from Entra ID
  imageUrl: text('image_url'),
  poste: text('poste'),
  leaveQuota: numeric('leave_quota', { precision: 5, scale: 2 }).notNull().default('25'),
  roles: userRoleEnum('roles')
    .array()
    .notNull()
    .default(['collaborateur']),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    color: varchar('color', { length: 7 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    pole: text('pole'),
    externalSourceId: text('external_source_id'),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('projects_external_source_id_idx').on(table.externalSourceId),
  ],
)

export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    workDate: date('work_date', { mode: 'string' }).notNull(),
    startTime: time('start_time'),
    duration: numeric('duration', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('time_entries_user_date_idx').on(table.userId, table.workDate),
  ],
)

export const absenceRequests = pgTable(
  'absence_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: absenceTypeEnum('type').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    status: absenceStatusEnum('status').notNull().default('en_attente'),
    processedByUserId: uuid('processed_by_user_id').references(() => users.id),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    rejectReasonCode: rejectReasonCodeEnum('reject_reason_code'),
    rejectComment: text('reject_comment'),
    halfDay: boolean('half_day').notNull().default(false),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('absence_requests_user_status_idx').on(table.userId, table.status),
  ],
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  timeEntries: many(timeEntries),
  absenceRequests: many(absenceRequests),
}))

export const projectsRelations = relations(projects, ({ many }) => ({
  timeEntries: many(timeEntries),
}))

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
}))

export const absenceRequestsRelations = relations(
  absenceRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [absenceRequests.userId],
      references: [users.id],
    }),
    processedBy: one(users, {
      fields: [absenceRequests.processedByUserId],
      references: [users.id],
    }),
  }),
)

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert
export type AbsenceRequest = typeof absenceRequests.$inferSelect
export type NewAbsenceRequest = typeof absenceRequests.$inferInsert

export type UserRole = (typeof userRoleEnum.enumValues)[number]
export type AbsenceType = (typeof absenceTypeEnum.enumValues)[number]
export type AbsenceStatus = (typeof absenceStatusEnum.enumValues)[number]
export type RejectReasonCode = (typeof rejectReasonCodeEnum.enumValues)[number]
