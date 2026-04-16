/**
 * Tokens de densité UI alignés sur le design system.
 * Référencés par les composants mais les classes globales de globals.css
 * couvrent la plupart des cas (app-kpi-*, app-card-*, etc.).
 */
export const uiDensity = {
  cardPad: 'p-4',
  cardPadHeader: 'px-4 py-3',
  cardPadHeaderCompact: 'px-4 py-2.5 pb-2',
  kpiLabel: 'text-xs font-medium text-muted-foreground',
  kpiValue: 'app-kpi-value',
  kpiHint: 'text-xs text-muted-foreground',
  sectionTitle: 'app-section-title',
} as const
