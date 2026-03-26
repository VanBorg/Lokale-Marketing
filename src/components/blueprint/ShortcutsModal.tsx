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
      <div className="bg-dark-card border border-dark-border rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-light">Sneltoetsen</h2>
          <button onClick={onClose} className="ui-icon-button" aria-label="Sluiten">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-dark-border/50 last:border-0">
              <span className="text-xs text-light/60">{s.label}</span>
              <kbd className="text-[10px] font-mono bg-dark-hover border border-dark-border rounded px-1.5 py-0.5 text-light/80 ml-3 whitespace-nowrap">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
