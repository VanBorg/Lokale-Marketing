/**
 * Plattegrond: kleur en icoon per ruimtefunctie (zelfde waarden als Elementen-stap).
 */

/**
 * Korte naam voor standaard kamernaam (bijv. "Slaapkamer 1"), los van het lange dropdown-label.
 */
export const RUIMTE_FUNCTIE_NAAM_PREFIX: Record<string, string> = {
  woon: 'Woonkamer',
  slaapkamer: 'Slaapkamer',
  keuken: 'Keuken',
  badkamer: 'Badkamer',
  wc: 'WC',
  gang: 'Hal',
  berging: 'Berging',
  garage: 'Garage',
  schuur: 'Schuur',
  kelder: 'Kelder',
  zolder: 'Zolder',
  wasruimte: 'Wasruimte',
  kantoor: 'Kantoor',
  'cv-techniek': 'Techniekruimte',
  overig: 'Ruimte',
}

export const RUIMTE_FUNCTIE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Niet gekozen' },
  { value: 'woon', label: 'Woonkamer / algemeen' },
  { value: 'slaapkamer', label: 'Slaapkamer' },
  { value: 'keuken', label: 'Keuken' },
  { value: 'badkamer', label: 'Badkamer' },
  { value: 'wc', label: 'WC' },
  { value: 'gang', label: 'Hal / gang' },
  { value: 'berging', label: 'Berging / voorraad' },
  { value: 'garage', label: 'Garage' },
  { value: 'schuur', label: 'Schuur / tuinhuis' },
  { value: 'kelder', label: 'Kelder' },
  { value: 'zolder', label: 'Zolder' },
  { value: 'wasruimte', label: 'Wasruimte' },
  { value: 'kantoor', label: 'Kantoor / werkplek' },
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

/** Bij geen / onbekende functie: nog steeds een icoon naast de kamernaam op de plattegrond. */
const DEFAULT_ROOM_ICON = '🏠'

const DEFAULT: RuimteFunctiePlanStyle = {
  fillIdle: '',
  fillSelected: '',
  strokeIdle: '',
  strokeSelected: '',
  icon: DEFAULT_ROOM_ICON,
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
  garage: {
    icon: '🚗',
    fillIdle: 'rgba(148, 163, 184, 0.28)',
    fillSelected: 'rgba(148, 163, 184, 0.4)',
    strokeIdle: '#475569',
    strokeSelected: '#64748b',
  },
  schuur: {
    icon: '🛖',
    fillIdle: 'rgba(120, 113, 95, 0.3)',
    fillSelected: 'rgba(120, 113, 95, 0.42)',
    strokeIdle: '#57534e',
    strokeSelected: '#78716c',
  },
  kelder: {
    icon: '🪜',
    fillIdle: 'rgba(100, 116, 139, 0.3)',
    fillSelected: 'rgba(100, 116, 139, 0.42)',
    strokeIdle: '#334155',
    strokeSelected: '#475569',
  },
  zolder: {
    icon: '🔝',
    fillIdle: 'rgba(214, 188, 150, 0.26)',
    fillSelected: 'rgba(214, 188, 150, 0.38)',
    strokeIdle: '#a16207',
    strokeSelected: '#ca8a04',
  },
  wasruimte: {
    icon: '🧺',
    fillIdle: 'rgba(125, 211, 252, 0.22)',
    fillSelected: 'rgba(125, 211, 252, 0.36)',
    strokeIdle: '#0369a1',
    strokeSelected: '#0284c7',
  },
  kantoor: {
    icon: '💼',
    fillIdle: 'rgba(167, 139, 250, 0.24)',
    fillSelected: 'rgba(167, 139, 250, 0.38)',
    strokeIdle: '#6d28d9',
    strokeSelected: '#7c3aed',
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
        icon: DEFAULT_ROOM_ICON,
      }
    }
    return {
      ...DEFAULT,
      fillIdle: 'rgba(53,180,211,0.07)',
      fillSelected: 'rgba(53,180,211,0.18)',
      strokeIdle: '#35B4D3',
      strokeSelected: '#5ecde8',
      icon: DEFAULT_ROOM_ICON,
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
