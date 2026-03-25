import { useState } from 'react'
import { useRoom } from '../../../store/blueprintStore'
import { polygonArea } from '../../../utils/blueprintGeometry'

const AFWERKING_OPTIONS = [
  'Stucwerk glad',
  'Stucwerk spatel',
  'Gipsplaat',
  'Houten betimmering',
  'Zichtbeton',
  'Open kap / geen',
]

interface StepPlafondProps {
  roomId: string | null
  onNext: () => void
  onPrev: () => void
}

export default function StepPlafond({ roomId, onNext, onPrev }: StepPlafondProps) {
  const room = useRoom(roomId ?? '')

  const [afwerking, setAfwerking] = useState(AFWERKING_OPTIONS[0])
  const [systeemplafond, setSysteemplafond] = useState(false)
  const [verlaagdeHoogte, setVerlaagdeHoogte] = useState(240)
  const [spotjes, setSpotjes] = useState(false)
  const [aantalSpots, setAantalSpots] = useState(4)
  const [bijzonderheden, setBijzonderheden] = useState('')

  const plafondM2 = room ? (polygonArea(room.vertices) / 10000).toFixed(2) : '—'

  return (
    <div className="space-y-3">
      {/* Read-only summary */}
      <div className="rounded-lg bg-white/5 border border-dark-border px-3 py-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-light/40 mb-1">Samenvatting kamer</p>
        <div className="flex justify-between text-xs">
          <span className="text-light/50">Plafondtype</span>
          <span className="text-light/70 capitalize">{room?.ceiling?.type ?? '—'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-light/50">Wandhoogte</span>
          <span className="text-light/70">{room ? `${room.wallHeight} cm` : '—'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-light/50">Plafondoppervlak</span>
          <span className="text-light/70">{plafondM2} m²</span>
        </div>
      </div>

      {/* Afwerking plafond */}
      <label className="flex flex-col gap-1">
        <span className="ui-label">Afwerking plafond</span>
        <select
          className="ui-input text-sm py-1.5"
          value={afwerking}
          onChange={e => setAfwerking(e.target.value)}
        >
          {AFWERKING_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>

      {/* Systeemplafond */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={systeemplafond}
            onChange={e => setSysteemplafond(e.target.checked)}
            className="w-4 h-4 rounded border-dark-border accent-accent"
          />
          <span className="text-sm text-light/80">Systeemplafond (verlaagd)</span>
        </label>
        {systeemplafond && (
          <label className="flex flex-col gap-1 pl-6">
            <span className="ui-label">Verlaagde hoogte (cm)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="ui-input text-sm py-1.5 flex-1"
                value={verlaagdeHoogte}
                min={100}
                max={500}
                onChange={e => setVerlaagdeHoogte(Number(e.target.value))}
              />
              <span className="text-xs text-light/40 shrink-0">cm</span>
            </div>
          </label>
        )}
      </div>

      {/* Spotjes */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={spotjes}
            onChange={e => setSpotjes(e.target.checked)}
            className="w-4 h-4 rounded border-dark-border accent-accent"
          />
          <span className="text-sm text-light/80">Spotjes / inbouwverlichting</span>
        </label>
        {spotjes && (
          <label className="flex flex-col gap-1 pl-6">
            <span className="ui-label">Aantal spots</span>
            <input
              type="number"
              className="ui-input text-sm py-1.5"
              value={aantalSpots}
              min={1}
              max={100}
              onChange={e => setAantalSpots(Number(e.target.value))}
            />
          </label>
        )}
      </div>

      {/* Bijzonderheden */}
      <label className="flex flex-col gap-1">
        <span className="ui-label">Bijzonderheden</span>
        <textarea
          className="ui-input text-sm py-1.5 resize-none"
          rows={2}
          value={bijzonderheden}
          placeholder="Bijzonderheden plafond..."
          onChange={e => setBijzonderheden(e.target.value)}
        />
      </label>

      {/* Navigation */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onNext}
          className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors duration-200"
        >
          Volgende →
        </button>
        <button
          type="button"
          onClick={onPrev}
          className="w-full px-4 py-2 text-xs text-light/50 hover:text-light transition-colors duration-200"
        >
          ← Vorige
        </button>
      </div>
    </div>
  )
}
