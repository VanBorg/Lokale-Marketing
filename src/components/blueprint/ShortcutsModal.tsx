import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ShortcutsModalProps {
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'Ctrl + Z', label: 'Ongedaan maken (Undo)' },
  { key: 'Ctrl + Y', label: 'Opnieuw uitvoeren (Redo)' },
  { key: 'Ctrl + Shift + Z', label: 'Opnieuw uitvoeren (Redo)' },
  { key: 'Escape', label: 'Deselecteer / annuleer tool' },
  { key: 'Delete / Backspace', label: 'Verwijder geselecteerde kamer of element' },
  { key: 'Shift + klik', label: 'Voeg kamer toe aan selectie' },
  { key: 'Ctrl + klik', label: 'Toggle kamer in selectie (aan/uit)' },
  { key: 'Shift + slepen op leeg canvas', label: 'Multi-select (selectiekader)' },
  { key: 'Slepen op leeg canvas', label: 'Canvas verplaatsen (pan)' },
  { key: '+ / =', label: 'Zoom in' },
  { key: '-', label: 'Zoom uit' },
  { key: 'Ctrl + scrollwiel', label: 'Zoom in/uit' },
  { key: 'Scrollwiel', label: 'Canvas verplaatsen (pan)' },
  { key: 'Spatie + slepen', label: 'Canvas verplaatsen (pan)' },
  { key: 'Middelste muisknop', label: 'Canvas verplaatsen (pan)' },
  { key: 'Dubbelklik canvas', label: 'Vrije tekening voltooien' },
  { key: 'S', label: 'Centreer beeld op oorsprong' },
  { key: 'Ctrl + S', label: 'Project opslaan' },
]

const SHORTCUTS_SPLIT_INDEX = Math.ceil(SHORTCUTS.length / 2)
const SHORTCUTS_LEFT = SHORTCUTS.slice(0, SHORTCUTS_SPLIT_INDEX)
const SHORTCUTS_RIGHT = SHORTCUTS.slice(SHORTCUTS_SPLIT_INDEX)

function ShortcutRow({ label, keyCombo }: { label: string; keyCombo: string }) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-dark-border/50 theme-light:border-neutral-200/60 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="text-xs text-light/80 theme-light:text-neutral-700 min-w-0 leading-snug">{label}</span>
      <kbd className="shrink-0 text-[10px] font-mono bg-dark-hover border border-dark-border rounded px-1.5 py-0.5 text-light/90 theme-light:bg-neutral-100 theme-light:border-neutral-300 theme-light:text-neutral-800 whitespace-nowrap self-start sm:self-center">
        {keyCombo}
      </kbd>
    </div>
  )
}

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-dark-card border border-dark-border rounded-xl w-[min(42rem,calc(100vw-1.5rem))] p-4 sm:p-6 shadow-2xl theme-light:bg-white theme-light:border-neutral-200"
        role="dialog"
        aria-labelledby="shortcuts-modal-title"
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 id="shortcuts-modal-title" className="text-base font-semibold text-light theme-light:text-neutral-900">
            Sneltoetsen
          </h2>
          <button onClick={onClose} className="ui-icon-button shrink-0" aria-label="Sluiten">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 divide-x divide-dark-border/50 theme-light:divide-neutral-200 min-h-0">
          <div className="space-y-0 min-w-0 pr-2 sm:pr-4">
            {SHORTCUTS_LEFT.map(s => (
              <ShortcutRow key={s.key} label={s.label} keyCombo={s.key} />
            ))}
          </div>
          <div className="space-y-0 min-w-0 pl-2 sm:pl-4">
            {SHORTCUTS_RIGHT.map(s => (
              <ShortcutRow key={s.key} label={s.label} keyCombo={s.key} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
