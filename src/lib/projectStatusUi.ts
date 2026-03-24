import type { ProjectStatus } from './database.types';

/** Volgorde van de stat-tellers na Totaal (projectenpagina). */
export const PROJECT_STATUS_STATS_ORDER: ProjectStatus[] = [
  'Afgerond',
  'Akkoord',
  'Offerte Verstuurd',
  'In Uitvoering',
  'Concept',
];

export const PROJECT_STATUS_LABEL_SHORT: Record<ProjectStatus, string> = {
  Concept: 'Concept',
  'Offerte Verstuurd': 'Offerte',
  Akkoord: 'Akkoord',
  'In Uitvoering': 'In uitvoering',
  Afgerond: 'Afgerond',
};

/** Tags op kaarten / zijpaneel — zie `ui.css` `.ui-badge--status-*` */
export const projectStatusBadgeClass: Record<ProjectStatus, string> = {
  Afgerond: 'ui-badge--status-afgerond',
  Akkoord: 'ui-badge--status-akkoord',
  'Offerte Verstuurd': 'ui-badge--status-offerte',
  'In Uitvoering': 'ui-badge--status-uitvoering',
  Concept: 'ui-badge--status-concept',
};

/** Stat-chips op projectenpagina — zie `ui.css` `.ui-stat-chip--status-*` */
export const projectStatusStatChipClass: Record<ProjectStatus, string> = {
  Afgerond: 'ui-stat-chip--status-afgerond',
  Akkoord: 'ui-stat-chip--status-akkoord',
  'Offerte Verstuurd': 'ui-stat-chip--status-offerte',
  'In Uitvoering': 'ui-stat-chip--status-uitvoering',
  Concept: 'ui-stat-chip--status-concept',
};

/** Sidebar statusdot (compacte lijst) */
export const projectStatusSidebarDotClass: Record<ProjectStatus, string> = {
  Afgerond: 'bg-amber-400',
  Akkoord: 'bg-green-400',
  'Offerte Verstuurd': 'bg-orange-400',
  'In Uitvoering': 'bg-sky-400',
  Concept: 'bg-red-400',
};
