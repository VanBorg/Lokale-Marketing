import { useState } from 'react'
import { useRoom } from '../../../store/blueprintStore'
import { useRoomDetailsStore } from '../../../store/roomDetailsStore'
import { polygonArea, formatNlDecimal } from '../../../utils/blueprintGeometry'

type Vloertype = 'Betonvloer' | 'Houten vloer' | 'Systeemvloer' | 'Zandcement dekvloer' | 'Overig'
type Afwerking = 'Tegels' | 'Parket' | 'Laminaat' | 'Gietvloer' | 'Tapijt' | 'Geen / ruwbouw'

interface VloerData {
  vloertype: Vloertype
  afwerking: Afwerking
  dikte: number
  vloerverwarming: boolean
  vochtkeringNodig: boolean
  bijzonderheden: string
}

const VLOERTYPEN: Vloertype[] = [
  'Betonvloer',
  'Houten vloer',
  'Systeemvloer',
  'Zandcement dekvloer',
  'Overig',
]

const AFWERKINGEN: Afwerking[] = [
  'Tegels',
  'Parket',
  'Laminaat',
  'Gietvloer',
  'Tapijt',
  'Geen / ruwbouw',
]

interface Props {
  roomId: string | null
  onNext: () => void
  onPrev: () => void
}

export default function StepVloer({ roomId, onNext, onPrev }: Props) {
  const room = useRoom(roomId ?? '')
  const storedVloer = useRoomDetailsStore(s => (roomId ? s.details[roomId]?.vloer : undefined))

  const [data, setData] = useState<VloerData>(() =>
    storedVloer
      ? {
          vloertype: storedVloer.vloertype as Vloertype,
          afwerking: storedVloer.afwerking as Afwerking,
          dikte: storedVloer.dikte,
          vloerverwarming: storedVloer.vloerverwarming,
          vochtkeringNodig: storedVloer.vochtkeringNodig,
          bijzonderheden: storedVloer.bijzonderheden,
        }
      : {
          vloertype: 'Betonvloer',
          afwerking: 'Tegels',
          dikte: 10,
          vloerverwarming: false,
          vochtkeringNodig: false,
          bijzonderheden: '',
        },
  )

  function patch(update: Partial<VloerData>) {
    setData(prev => ({ ...prev, ...update }))
  }

  if (!room) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-neutral-400 theme-light:text-neutral-600">
          Plaats eerst een kamer in stap 1 voordat je de vloer kunt invullen.
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

  const floorSqM = polygonArea(room.vertices) / 10_000

  return (
    <div className="space-y-3">
      {/* Vloeroppervlak badge */}
      <div className="rounded-lg bg-accent/10 px-3 py-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-accent">Vloeroppervlak</span>
        <span className="text-base font-bold text-accent tabular-nums">
          {formatNlDecimal(floorSqM, 2)} m²
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Vloertype */}
        <label className="flex flex-col gap-1">
          <span className="ui-label">Vloertype</span>
          <select
            className="ui-input text-sm py-1.5"
            value={data.vloertype}
            onChange={e => patch({ vloertype: e.target.value as Vloertype })}
          >
            {VLOERTYPEN.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        {/* Afwerking */}
        <label className="flex flex-col gap-1">
          <span className="ui-label">Afwerking</span>
          <select
            className="ui-input text-sm py-1.5"
            value={data.afwerking}
            onChange={e => patch({ afwerking: e.target.value as Afwerking })}
          >
            {AFWERKINGEN.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        {/* Vloerdikte */}
        <label className="flex flex-col gap-1">
          <span className="ui-label">Vloerdikte (cm)</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              className="ui-input text-sm py-1.5 flex-1 min-w-0 tabular-nums"
              value={data.dikte}
              min={3}
              max={100}
              onChange={e => patch({ dikte: Number(e.target.value) })}
            />
            <span className="shrink-0 text-xs text-neutral-500 theme-light:text-neutral-600">cm</span>
          </div>
        </label>

        {/* Checkboxes */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-dark-border theme-light:border-neutral-300"
              checked={data.vloerverwarming}
              onChange={e => patch({ vloerverwarming: e.target.checked })}
            />
            <span className="ui-label !mb-0">Vloerverwarming</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-dark-border theme-light:border-neutral-300"
              checked={data.vochtkeringNodig}
              onChange={e => patch({ vochtkeringNodig: e.target.checked })}
            />
            <span className="ui-label !mb-0">Vochtkering nodig</span>
          </label>
        </div>

        {/* Bijzonderheden */}
        <label className="flex flex-col gap-1">
          <span className="ui-label">Bijzonderheden</span>
          <textarea
            className="ui-input text-sm py-1.5 resize-none"
            rows={2}
            value={data.bijzonderheden}
            placeholder="Optionele opmerkingen..."
            onChange={e => patch({ bijzonderheden: e.target.value })}
          />
        </label>
      </div>

      {/* Navigatie */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (roomId) {
              useRoomDetailsStore.getState().setVloer(roomId, data)
            }
            onNext()
          }}
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
