import { useRoomDetailsStore } from '../../../store/roomDetailsStore'
import { useRoom } from '../../../store/blueprintStore'
import { RUIMTE_FUNCTIE_OPTIONS } from '../../../utils/ruimteFunctiePlanStyle'

interface StepElementenProps {
  roomId: string | null
  onNext: () => void
  onPrev: () => void
}

export default function StepElementen({ roomId, onNext, onPrev }: StepElementenProps) {
  const room = useRoom(roomId ?? '')
  const ruimteFunctie = useRoomDetailsStore(s =>
    roomId ? s.details[roomId]?.ruimteFunctie ?? '' : '',
  )
  const setRuimteFunctie = useRoomDetailsStore(s => s.setRuimteFunctie)

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
      <p className="text-[11px] leading-relaxed text-neutral-400 theme-light:text-neutral-600">
        Elke extra ruimte (WC, berging, hal, techniekruimte, …) teken je op de plattegrond als{' '}
        <span className="font-medium text-light/80 theme-light:text-neutral-800">aparte kamer</span>{' '}
        via <span className="font-medium text-accent">Nieuwe kamer +</span> bovenin. Geef hier de{' '}
        <span className="font-medium text-light/80 theme-light:text-neutral-800">functie van deze kamer</span>{' '}
        door — handig voor de materiaallijst en offerte.
      </p>

      <label className="flex flex-col gap-1">
        <span className="ui-label">Functie van deze kamer</span>
        <select
          className="ui-input text-sm py-1.5"
          value={ruimteFunctie}
          onChange={e => {
            const v = e.target.value
            if (roomId) setRuimteFunctie(roomId, v)
          }}
        >
          {RUIMTE_FUNCTIE_OPTIONS.map(opt => (
            <option key={opt.value || '—'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

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
