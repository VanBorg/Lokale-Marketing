import { useRoom } from '../../../store/blueprintStore'

interface StepElementenProps {
  roomId: string | null
  onNext: () => void
  onPrev: () => void
}

/**
 * Placeholder — functie/label staat in stap 1 (Kamer). Hier komen later aanvullende element-opties.
 */
export default function StepElementen({ roomId, onNext, onPrev }: StepElementenProps) {
  const room = useRoom(roomId ?? '')

  if (!room) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-neutral-400 theme-light:text-neutral-600">
          Plaats eerst een kamer in stap 1.
        </p>
        <button
          type="button"
          onClick={onPrev}
          className="w-full px-4 py-2 text-xs text-neutral-400 transition-colors duration-200 hover:text-neutral-200 theme-light:text-neutral-600 theme-light:hover:text-neutral-900"
        >
          ← Vorige
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-neutral-400 theme-light:text-neutral-600">
        Elementen — gereserveerd voor latere uitbreidingen.
      </p>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onNext}
          className="w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 bg-accent text-white hover:bg-accent/90"
        >
          Volgende →
        </button>
        <button
          type="button"
          onClick={onPrev}
          className="w-full px-4 py-2 text-xs text-neutral-400 transition-colors duration-200 hover:text-neutral-200 theme-light:text-neutral-600 theme-light:hover:text-neutral-900"
        >
          ← Vorige
        </button>
      </div>
    </div>
  )
}
