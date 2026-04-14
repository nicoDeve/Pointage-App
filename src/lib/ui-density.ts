/**
 * Tokens de densité UI alignés sur le design system.
 * Référencés par les composants mais les classes globales de globals.css
 * couvrent la plupart des cas (app-kpi-*, app-card-*, etc.).
 */
export const uiDensity = {
  pageStack: 'flex flex-col gap-3',
  gridGap: 'gap-2',
  cardPad: 'p-4',
  cardPadHeader: 'px-4 py-3',
  cardPadHeaderCompact: 'px-4 py-2.5 pb-2',
  listRowCompact: 'px-3 py-2.5',
  kpiLabel: 'app-kpi-label',
  kpiValue: 'app-kpi-value',
  kpiHint: 'app-kpi-hint',
  sectionTitle: 'app-section-title',
} as const
