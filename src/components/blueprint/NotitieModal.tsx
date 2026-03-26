import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui'

interface NotitieModalProps {
  initialText: string
  onSave: (text: string) => void
  onClose: () => void
}

export default function NotitieModal({ initialText, onSave, onClose }: NotitieModalProps) {
  const [draft, setDraft] = useState(initialText)

  useEffect(() => {
    setDraft(initialText)
  }, [initialText])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = useCallback(() => {
    onSave(draft)
    onClose()
  }, [draft, onSave, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-dark-border bg-dark-card p-6 shadow-2xl theme-light:border-neutral-200 theme-light:bg-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-light theme-light:text-neutral-900">Notities</h2>
          <button type="button" onClick={onClose} className="ui-icon-button" aria-label="Sluiten">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-xs text-neutral-400 theme-light:text-neutral-500">
          Vrije notities bij dit project op het werkblad. Wordt mee opgeslagen met de plattegrond.
        </p>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={12}
          className="mb-4 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none transition-colors focus:border-accent theme-light:border-neutral-300 theme-light:bg-neutral-50 theme-light:text-neutral-900"
          placeholder="Typ je notities…"
          aria-label="Werkblad-notities"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleSave}>
            Opslaan
          </Button>
        </div>
      </div>
    </div>
  )
}
