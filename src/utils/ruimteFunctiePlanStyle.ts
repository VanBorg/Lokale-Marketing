/**
 * Plattegrond: kleur en icoon per ruimtefunctie (zelfde waarden als Elementen-stap).
 */

export const RUIMTE_FUNCTIE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Niet gekozen' },
  { value: 'woon', label: 'Woonkamer / algemeen' },
  { value: 'slaapkamer', label: 'Slaapkamer' },
  { value: 'keuken', label: 'Keuken' },
  { value: 'badkamer', label: 'Badkamer' },
  { value: 'wc', label: 'WC' },
  { value: 'gang', label: 'Hal / gang' },
  { value: 'berging', label: 'Berging / voorraad' },
  { value: 'cv-techniek', label: 'CV / boiler / techniek' },
  { value: 'overig', label: 'Overig' },
]

export interface RuimteFunctiePlanStyle {
  fillIdle: string
  fillSelected: string
  strokeIdle: string
  strokeSelected: string
  icon: string
}

const DEFAULT: RuimteFunctiePlanStyle = {
  fillIdle: '',
  fillSelected: '',
  strokeIdle: '',
  strokeSelected: '',
  icon: '',
}

/** Per functie: vulkleur, rand, emoji-icoon (plattegrond). */
const BY_KEY: Record<string, RuimteFunctiePlanStyle> = {
  woon: {
    icon: '🛋️',
    fillIdle: 'rgba(255, 200, 140, 0.26)',
    fillSelected: 'rgba(255, 200, 140, 0.38)',
    strokeIdle: '#c2410c',
    strokeSelected: '#ea580c',
  },
  slaapkamer: {
    icon: '🛏️',
    fillIdle: 'rgba(165, 180, 252, 0.32)',
    fillSelected: 'rgba(165, 180, 252, 0.44)',
    strokeIdle: '#4f46e5',
    strokeSelected: '#6366f1',
  },
  keuken: {
    icon: '🍳',
    fillIdle: 'rgba(252, 165, 165, 0.28)',
    fillSelected: 'rgba(252, 165, 165, 0.4)',
    strokeIdle: '#dc2626',
    strokeSelected: '#ef4444',
  },
  badkamer: {
    icon: '🚿',
    fillIdle: 'rgba(103, 232, 249, 0.3)',
    fillSelected: 'rgba(103, 232, 249, 0.42)',
    strokeIdle: '#0891b2',
    strokeSelected: '#06b6d4',
  },
  wc: {
    icon: '🚽',
    fillIdle: 'rgba(148, 163, 184, 0.32)',
    fillSelected: 'rgba(148, 163, 184, 0.44)',
    strokeIdle: '#475569',
    strokeSelected: '#64748b',
  },
  gang: {
    icon: '🚪',
    fillIdle: 'rgba(214, 211, 209, 0.28)',
    fillSelected: 'rgba(214, 211, 209, 0.4)',
    strokeIdle: '#78716c',
    strokeSelected: '#a8a29e',
  },
  berging: {
    icon: '📦',
    fillIdle: 'rgba(180, 150, 120, 0.3)',
    fillSelected: 'rgba(180, 150, 120, 0.42)',
    strokeIdle: '#92400e',
    strokeSelected: '#b45309',
  },
  'cv-techniek': {
    icon: '⚙️',
    fillIdle: 'rgba(220, 120, 110, 0.28)',
    fillSelected: 'rgba(220, 120, 110, 0.4)',
    strokeIdle: '#b91c1c',
    strokeSelected: '#dc2626',
  },
  overig: {
    icon: '📋',
    fillIdle: 'rgba(200, 200, 210, 0.22)',
    fillSelected: 'rgba(200, 200, 210, 0.34)',
    strokeIdle: '#64748b',
    strokeSelected: '#94a3b8',
  },
}

export function getRuimteFunctiePlanStyle(
  ruimteFunctie: string | undefined,
  isLight: boolean,
): RuimteFunctiePlanStyle {
  const key = ruimteFunctie?.trim() ?? ''
  if (!key || !BY_KEY[key]) {
    if (isLight) {
      return {
        ...DEFAULT,
        fillIdle: 'rgba(14,116,144,0.08)',
        fillSelected: 'rgba(14,116,144,0.18)',
        strokeIdle: '#0e7490',
        strokeSelected: '#0891b2',
        icon: '',
      }
    }
    return {
      ...DEFAULT,
      fillIdle: 'rgba(53,180,211,0.07)',
      fillSelected: 'rgba(53,180,211,0.18)',
      strokeIdle: '#35B4D3',
      strokeSelected: '#5ecde8',
      icon: '',
    }
  }
  const s = BY_KEY[key]
  return {
    icon: s.icon,
    fillIdle: s.fillIdle,
    fillSelected: s.fillSelected,
    strokeIdle: s.strokeIdle,
    strokeSelected: s.strokeSelected,
  }
}
