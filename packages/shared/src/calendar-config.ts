/**
 * Configuration calendrier — fichier éditable, PAS d'API externe.
 * L'entreprise ajoute/retire des lignes pour les jours fériés.
 */

export const PUBLIC_HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-01-01': "Jour de l'an",
  '2025-04-21': 'Lundi de Pâques',
  '2025-05-01': 'Fête du Travail',
  '2025-05-08': 'Victoire 1945',
  '2025-05-29': 'Ascension',
  '2025-06-09': 'Lundi de Pentecôte',
  '2025-07-14': 'Fête nationale',
  '2025-08-15': 'Assomption',
  '2025-11-01': 'Toussaint',
  '2025-11-11': 'Armistice',
  '2025-12-25': 'Noël',
  // 2026
  '2026-01-01': "Jour de l'an",
  '2026-04-06': 'Lundi de Pâques',
  '2026-05-01': 'Fête du Travail',
  '2026-05-08': 'Victoire 1945',
  '2026-05-14': 'Ascension',
  '2026-05-25': 'Lundi de Pentecôte',
  '2026-07-14': 'Fête nationale',
  '2026-08-15': 'Assomption',
  '2026-11-01': 'Toussaint',
  '2026-11-11': 'Armistice',
  '2026-12-25': 'Noël',
  // 2027
  '2027-01-01': "Jour de l'an",
  '2027-03-29': 'Lundi de Pâques',
  '2027-05-01': 'Fête du Travail',
  '2027-05-08': 'Victoire 1945',
  '2027-05-13': 'Ascension',
  '2027-05-17': 'Lundi de Pentecôte',
  '2027-07-14': 'Fête nationale',
  '2027-08-15': 'Assomption',
  '2027-11-01': 'Toussaint',
  '2027-11-11': 'Armistice',
  '2027-12-25': 'Noël',
}

export const WEEKLY_OFF_DAYS: number[] = [0, 6]

export const HOURS_PER_WORKDAY = 7

export const DEFAULT_WEEKLY_TARGET = 35

/** Quota annuel de jours de télétravail */
export const TELETRAVAIL_QUOTA = 10

/** Only .5 increments allowed (0.5, 1, 1.5 … 7) */
export const HOURS_STEP = 0.5

/** Hard cap per day — no overtime allowed */
export const MAX_HOURS_PER_DAY = HOURS_PER_WORKDAY
