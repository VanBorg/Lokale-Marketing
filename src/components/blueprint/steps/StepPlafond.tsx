import { useCallback, useEffect, useState } from 'react'
import { blueprintStore, useRoom, type RoomCeiling } from '../../../store/blueprintStore'
import { useRoomDetailsStore } from '../../../store/roomDetailsStore'
import {
  clampCmFromMetersField,
  cmToMeterFieldValue,
  formatCmAsMeters,
  polygonArea,
} from '../../../utils/blueprintGeometry'
import {
  buildCeiling,
  CASSETTE_GRIDS,
  CEILING_OPTIONS,
  vlakCeilingHeightFromRoom,
} from '../roomStructureHelpers'

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
  const stored = useRoomDetailsStore(s => (roomId ? s.details[roomId]?.plafond : undefined))

  const [ceilingType, setCeilingType] = useState<RoomCeiling['type']>('vlak')
  const [ceilingHeight, setCeilingHeight] = useState(250)
  const [ceilingRidgeHeight, setCeilingRidgeHeight] = useState(350)
  const [cassetteGrid, setCassetteGrid] = useState('60×60 cm')

  const [afwerking, setAfwerking] = useState(stored?.afwerking ?? AFWERKING_OPTIONS[0])
  const [systeemplafond, setSysteemplafond] = useState(stored?.systeemplafond ?? false)
  const [verlaagdeHoogte, setVerlaagdeHoogte] = useState(stored?.verlaagdeHoogte ?? 240)
  const [spotjes, setSpotjes] = useState(stored?.spotjes ?? false)
  const [aantalSpots, setAantalSpots] = useState(stored?.aantalSpots ?? 4)
  const [bijzonderheden, setBijzonderheden] = useState(stored?.bijzonderheden ?? '')

  useEffect(() => {
    if (!room) return
    const c = room.ceiling
    if (c) {
      setCeilingType(c.type)
      setCeilingHeight(c.height)
      if (c.ridgeHeight != null) setCeilingRidgeHeight(c.ridgeHeight)
      if (c.cassetteGrid) setCassetteGrid(c.cassetteGrid)
    } else {
      setCeilingType('vlak')
      setCeilingHeight(vlakCeilingHeightFromRoom(room))
    }
  }, [room?.id])

  const plafondM2 = room ? (polygonArea(room.vertices) / 10000).toFixed(2) : '—'

  const ceilingNeedsRidge =
    ceilingType === 'schuin' || ceilingType === 'gewelfd' || ceilingType === 'open-kap'

  const pushCeilingToStore = useCallback(
    (type: RoomCeiling['type'], height: number, ridge: number, grid: string) => {
      if (!roomId) return
      blueprintStore.getState().updateRoom(roomId, {
        ceiling: buildCeiling(type, height, ridge, grid),
      })
    },
    [roomId],
  )

  const heightForVlakCeiling = useCallback(() => {
    if (!room) return 250
    return vlakCeilingHeightFromRoom(room)
  }, [room])

  const selectCeilingType = useCallback(
    (c: (typeof CEILING_OPTIONS)[number]) => {
      setCeilingType(c.id)
      if (!roomId || !room) return
      if (c.id === 'vlak') {
        const h = heightForVlakCeiling()
        setCeilingHeight(h)
        blueprintStore.getState().updateRoom(roomId, {
          ceiling: buildCeiling('vlak', h, ceilingRidgeHeight, cassetteGrid),
        })
      } else {
        blueprintStore.getState().updateRoom(roomId, {
          ceiling: buildCeiling(c.id, ceilingHeight, ceilingRidgeHeight, cassetteGrid),
        })
      }
    },
    [roomId, room, ceilingHeight, ceilingRidgeHeight, cassetteGrid, heightForVlakCeiling],
  )

  if (!room) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-neutral-400 theme-light:text-neutral-600">
          Plaats eerst een kamer in stap 1 voordat je het plafond kunt invullen.
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
      <div className="space-y-1.5 rounded-lg border border-dark-border bg-white/5 px-3 py-2.5 theme-light:border-neutral-200 theme-light:bg-neutral-100">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 theme-light:text-neutral-600">
          Samenvatting kamer
        </p>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500 theme-light:text-neutral-600">Plafondtype</span>
          <span className="text-neutral-300 capitalize theme-light:text-neutral-800">{room.ceiling?.type ?? 'vlak'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500 theme-light:text-neutral-600">Wandhoogte (ref.)</span>
          <span className="text-neutral-300 theme-light:text-neutral-800">
            {formatCmAsMeters(room.wallHeight)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500 theme-light:text-neutral-600">Plafondoppervlak</span>
          <span className="text-neutral-300 theme-light:text-neutral-800">{plafondM2} m²</span>
        </div>
      </div>

      {/* Plafondtype (model) */}
      <div className="flex flex-col gap-1.5">
        <span className="ui-label">Plafondtype</span>
        <div className="grid grid-cols-3 gap-1.5">
          {CEILING_OPTIONS.slice(0, 3).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCeilingType(c)}
              className={[
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all duration-150',
                ceilingType === c.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark text-neutral-400 hover:border-accent/40 hover:text-neutral-200 theme-light:border-neutral-300 theme-light:bg-neutral-50 theme-light:text-neutral-700 theme-light:hover:text-neutral-900',
              ].join(' ')}
            >
              <span className="text-base leading-none">{c.icon}</span>
              <span className="text-[9px]">{c.label}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {CEILING_OPTIONS.slice(3).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCeilingType(c)}
              className={[
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all duration-150',
                ceilingType === c.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark text-neutral-400 hover:border-accent/40 hover:text-neutral-200 theme-light:border-neutral-300 theme-light:bg-neutral-50 theme-light:text-neutral-700 theme-light:hover:text-neutral-900',
              ].join(' ')}
            >
              <span className="text-base leading-none">{c.icon}</span>
              <span className="text-[9px]">{c.label}</span>
            </button>
          ))}
        </div>

        {ceilingNeedsRidge ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="ui-label">Hoogte laag (m)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  className="ui-input text-xs py-1 flex-1 tabular-nums"
                  value={cmToMeterFieldValue(ceilingHeight)}
                  min={1}
                  max={6}
                  step={0.01}
                  onChange={e => {
                    const m = parseFloat(e.target.value)
                    if (Number.isNaN(m)) return
                    const v = clampCmFromMetersField(m, 100, 600)
                    setCeilingHeight(v)
                    pushCeilingToStore(ceilingType, v, ceilingRidgeHeight, cassetteGrid)
                  }}
                />
                <span className="shrink-0 text-[10px] text-neutral-500 theme-light:text-neutral-600">m</span>
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="ui-label">Hoogte hoog (m)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  className="ui-input text-xs py-1 flex-1 tabular-nums"
                  value={cmToMeterFieldValue(ceilingRidgeHeight)}
                  min={1}
                  max={10}
                  step={0.01}
                  onChange={e => {
                    const m = parseFloat(e.target.value)
                    if (Number.isNaN(m)) return
                    const v = clampCmFromMetersField(m, 100, 1000)
                    setCeilingRidgeHeight(v)
                    pushCeilingToStore(ceilingType, ceilingHeight, v, cassetteGrid)
                  }}
                />
                <span className="shrink-0 text-[10px] text-neutral-500 theme-light:text-neutral-600">m</span>
              </div>
            </label>
          </div>
        ) : ceilingType === 'vlak' ? (
          <p className="text-[10px] text-neutral-500 theme-light:text-neutral-600">
            Vlak plafond gebruikt dezelfde hoogte als de wanden in stap <span className="font-medium">Wanden</span> (3) — geen aparte plafondhoogte nodig.
          </p>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="ui-label">Plafond hoogte (m)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                className="ui-input text-xs py-1 flex-1 tabular-nums"
                value={cmToMeterFieldValue(ceilingHeight)}
                min={1}
                max={6}
                step={0.01}
                onChange={e => {
                  const m = parseFloat(e.target.value)
                  if (Number.isNaN(m)) return
                  const v = clampCmFromMetersField(m, 100, 600)
                  setCeilingHeight(v)
                  pushCeilingToStore(ceilingType, v, ceilingRidgeHeight, cassetteGrid)
                }}
              />
              <span className="shrink-0 text-[10px] text-neutral-500 theme-light:text-neutral-600">m</span>
            </div>
          </label>
        )}

        {ceilingType === 'cassette' && (
          <label className="flex flex-col gap-1">
            <span className="ui-label">Cassette raster</span>
            <select
              className="ui-input text-xs py-1"
              value={cassetteGrid}
              onChange={e => {
                const v = e.target.value
                setCassetteGrid(v)
                pushCeilingToStore(ceilingType, ceilingHeight, ceilingRidgeHeight, v)
              }}
            >
              {CASSETTE_GRIDS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        )}
      </div>

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

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={systeemplafond}
            onChange={e => setSysteemplafond(e.target.checked)}
            className="h-4 w-4 rounded border-dark-border accent-accent theme-light:border-neutral-300"
          />
          <span className="text-sm text-neutral-300 theme-light:text-neutral-800">Systeemplafond (verlaagd)</span>
        </label>
        {systeemplafond && (
          <label className="flex flex-col gap-1 pl-6">
            <span className="ui-label">Verlaagde hoogte (m)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="ui-input text-sm py-1.5 flex-1 tabular-nums"
                value={cmToMeterFieldValue(verlaagdeHoogte)}
                min={1}
                max={5}
                step={0.01}
                onChange={e =>
                  setVerlaagdeHoogte(clampCmFromMetersField(parseFloat(e.target.value), 100, 500))
                }
              />
              <span className="shrink-0 text-xs text-neutral-500 theme-light:text-neutral-600">m</span>
            </div>
          </label>
        )}
      </div>

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

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (roomId) {
              useRoomDetailsStore.getState().setPlafond(roomId, {
                afwerking,
                systeemplafond,
                verlaagdeHoogte,
                spotjes,
                aantalSpots,
                bijzonderheden,
              })
            }
            onNext()
          }}
          className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors duration-200"
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
