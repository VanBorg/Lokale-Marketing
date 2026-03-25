import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { blueprintStore } from '../../store/blueprintStore'
import {
  generateShapeVertices,
  formatNlDecimal,
} from '../../utils/blueprintGeometry'
import type { Point, ShapeType, RoofType } from '../../utils/blueprintGeometry'
import type { RoomCeiling } from '../../store/blueprintStore'
import RoomShapePicker from './RoomShapePicker'

/** Zelfde stap als wandlengte in het metrische rooster (5 cm). */
const METER_FIELD_NUDGE_CM = 5

/** Eerste herhaling na ingedrukt houden; daarna interval voor “door-scrollen”. */
const METER_REPEAT_DELAY_MS = 420
const METER_REPEAT_INTERVAL_MS = 55

/** Inline SVG’s — voorkomt bundel/tree-shake issues met named Lucide-exports. */
function MeterChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 15 12 9 6 15" />
    </svg>
  )
}

function MeterChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9 12 15 18 9" />
    </svg>
  )
}

function MeterRepeatButton({
  onTick,
  'aria-label': ariaLabel,
  children,
}: {
  onTick: () => void
  'aria-label': string
  children: ReactNode
}) {
  const btnClass =
    'flex items-center justify-center py-0.5 text-light/50 hover:text-light hover:bg-light/[0.06] transition-colors select-none touch-manipulation'
  /** DOM timer handles are numeric; Node typings can make `setTimeout` return `Timeout` (build fails). */
  const delayRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const tickRef = useRef(onTick)
  tickRef.current = onTick

  const stop = useCallback(() => {
    if (delayRef.current != null) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    tickRef.current()
    stop()
    delayRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => tickRef.current(), METER_REPEAT_INTERVAL_MS)
    }, METER_REPEAT_DELAY_MS)
  }, [stop])

  useEffect(() => () => stop(), [stop])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.preventDefault()
      start()
      const onRelease = () => {
        stop()
        window.removeEventListener('pointerup', onRelease)
        window.removeEventListener('pointercancel', onRelease)
      }
      window.addEventListener('pointerup', onRelease)
      window.addEventListener('pointercancel', onRelease)
    },
    [start, stop],
  )

  return (
    <button
      type="button"
      className={btnClass}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onKeyDown={ev => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          tickRef.current()
        }
      }}
    >
      {children}
    </button>
  )
}

function MeterArrowButtons({ onUp, onDown }: { onUp: () => void; onDown: () => void }) {
  return (
    <div
      className="flex flex-col shrink-0 w-7 border border-dark-border rounded-md overflow-hidden divide-y divide-dark-border"
      role="group"
      aria-label="Waarde aanpassen"
    >
      <MeterRepeatButton onTick={onUp} aria-label="Verhogen">
        <MeterChevronUpIcon className="shrink-0" />
      </MeterRepeatButton>
      <MeterRepeatButton onTick={onDown} aria-label="Verlagen">
        <MeterChevronDownIcon className="shrink-0" />
      </MeterRepeatButton>
    </div>
  )
}

const ROOF_OPTIONS: { id: RoofType; label: string; icon: string }[] = [
  { id: 'plat',         label: 'Plat',     icon: '▬' },
  { id: 'schuin-enkel', label: 'Schuin',   icon: '◺' },
  { id: 'zadeldak',     label: 'Zadel',    icon: '⋀' },
  { id: 'schilddak',    label: 'Schild',   icon: '◇' },
  { id: 'mansardedak',  label: 'Mansarde', icon: '⌂' },
  { id: 'platband',     label: 'Platband', icon: '▭' },
]

const CEILING_OPTIONS: { id: RoomCeiling['type']; label: string; icon: string }[] = [
  { id: 'vlak',      label: 'Vlak',     icon: '▬' },
  { id: 'schuin',    label: 'Schuin',   icon: '◺' },
  { id: 'cassette',  label: 'Cassette', icon: '⊞' },
  { id: 'gewelfd',   label: 'Gewelfd',  icon: '∩' },
  { id: 'open-kap',  label: 'Open kap', icon: '⋀' },
]

const CASSETTE_GRIDS = ['60×60 cm', '30×30 cm', '60×120 cm']

export interface StepKamerFormProps {
  onNext: (roomId: string) => void
  onPreviewChange?: (vertices: Point[]) => void
  controlledWidth?: number
  controlledDepth?: number
  onWidthChange?: (w: number) => void
  onDepthChange?: (d: number) => void
  currentPreviewVertices?: Point[]
}

export default function StepKamerForm({
  onNext,
  onPreviewChange,
  controlledWidth,
  controlledDepth,
  onWidthChange,
  onDepthChange,
  currentPreviewVertices,
}: StepKamerFormProps) {
  const [shape, setShape] = useState<ShapeType>('rechthoek')
  const [localWidth, setLocalWidth] = useState(controlledWidth ?? 400)
  const [localDepth, setLocalDepth] = useState(controlledDepth ?? 300)

  const roomWidth = controlledWidth ?? localWidth
  const roomDepth = controlledDepth ?? localDepth

  const setRoomWidth = (w: number) => { setLocalWidth(w); onWidthChange?.(w) }
  const setRoomDepth = (d: number) => { setLocalDepth(d); onDepthChange?.(d) }

  const [roomName, setRoomName]         = useState('')
  const [wallHeight, setWallHeight]     = useState(250)
  const [roofType, setRoofType]         = useState<RoofType>('plat')
  const [roofPeakHeight, setRoofPeakHeight] = useState(150)

  // Wall height mode
  const [wallHeightMode, setWallHeightMode] = useState<'uniform' | 'per-wall'>('uniform')
  const [perWallHeights, setPerWallHeights] = useState<number[]>([])

  // Ceiling
  const [ceilingType, setCeilingType]           = useState<RoomCeiling['type']>('vlak')
  const [ceilingHeight, setCeilingHeight]       = useState(250)
  const [ceilingRidgeHeight, setCeilingRidgeHeight] = useState(350)
  const [cassetteGrid, setCassetteGrid]         = useState('60×60 cm')

  /** Tekstvelden voor breedte/diepte in meters (NL), bron blijft cm. */
  const [widthDraftM, setWidthDraftM] = useState<string | null>(null)
  const [depthDraftM, setDepthDraftM] = useState<string | null>(null)

  const cmFromMetersInput = (raw: string): number | null => {
    const m = parseFloat(raw.trim().replace(',', '.'))
    if (Number.isNaN(m)) return null
    return Math.round(Math.min(5000, Math.max(50, m * 100)))
  }

  const commitWidthM = () => {
    if (widthDraftM === null) return
    const raw = widthDraftM.trim()
    setWidthDraftM(null)
    if (raw === '') return
    const cm = cmFromMetersInput(raw)
    if (cm !== null) setRoomWidth(cm)
  }

  const commitDepthM = () => {
    if (depthDraftM === null) return
    const raw = depthDraftM.trim()
    setDepthDraftM(null)
    if (raw === '') return
    const cm = cmFromMetersInput(raw)
    if (cm !== null) setRoomDepth(cm)
  }

  const nudgeWidthCm = (deltaCm: number) => {
    setWidthDraftM(null)
    const base =
      widthDraftM !== null ? (cmFromMetersInput(widthDraftM) ?? roomWidth) : roomWidth
    setRoomWidth(Math.min(5000, Math.max(50, base + deltaCm)))
  }

  const nudgeDepthCm = (deltaCm: number) => {
    setDepthDraftM(null)
    const base =
      depthDraftM !== null ? (cmFromMetersInput(depthDraftM) ?? roomDepth) : roomDepth
    setRoomDepth(Math.min(5000, Math.max(50, base + deltaCm)))
  }

  const previewVertices = useMemo(
    () => generateShapeVertices(shape, roomWidth, roomDepth),
    [shape, roomWidth, roomDepth],
  )

  useEffect(() => {
    onPreviewChange?.(previewVertices)
  }, [previewVertices, onPreviewChange])

  const handleSwitchToPerWall = () => {
    setPerWallHeights(Array(previewVertices.length).fill(wallHeight))
    setWallHeightMode('per-wall')
  }

  const handleSwitchToUniform = () => {
    setWallHeightMode('uniform')
  }

  const handlePlace = useCallback(() => {
    const vertices =
      (currentPreviewVertices && currentPreviewVertices.length >= 3)
        ? currentPreviewVertices
        : generateShapeVertices(shape, roomWidth, roomDepth)
    if (vertices.length < 3) return

    const ceiling: RoomCeiling = {
      type: ceilingType,
      height: ceilingHeight,
      ...(ceilingType !== 'vlak' && ceilingType !== 'cassette'
        ? { ridgeHeight: ceilingRidgeHeight }
        : {}),
      ...(ceilingType === 'cassette' ? { cassetteGrid } : {}),
    }

    const id = blueprintStore.getState().addRoom(vertices, {
      name: roomName || 'Ruimte',
      wallHeight,
      shape,
      planWidthCm: roomWidth,
      planDepthCm: roomDepth,
      roofType,
      roofPeakHeight,
      ...(wallHeightMode === 'per-wall' ? { wallHeights: perWallHeights } : {}),
      ceiling,
    })
    blueprintStore.getState().select([id])
    onNext(id)
  }, [
    currentPreviewVertices, shape, roomWidth, roomDepth, roomName, wallHeight, roofType, roofPeakHeight,
    wallHeightMode, perWallHeights, ceilingType, ceilingHeight, ceilingRidgeHeight,
    cassetteGrid, onNext,
  ])

  const showPeakHeight = roofType !== 'plat' && roofType !== 'platband'
  const ceilingNeedsRidge = ceilingType === 'schuin' || ceilingType === 'gewelfd' || ceilingType === 'open-kap'

  return (
    <div className="space-y-3">
      <RoomShapePicker selected={shape} onSelect={setShape} />

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="ui-label">Breedte (m)</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              className="ui-input text-sm py-1.5 flex-1 min-w-0 tabular-nums"
              title="Breedte in meters (bijv. 4,00); pijltjes omhoog/omlaag: ±5 cm"
              value={widthDraftM !== null ? widthDraftM : formatNlDecimal(roomWidth / 100, 2)}
              onFocus={() => setWidthDraftM(formatNlDecimal(roomWidth / 100, 2))}
              onChange={e => setWidthDraftM(e.target.value)}
              onBlur={commitWidthM}
              onKeyDown={e => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  nudgeWidthCm(METER_FIELD_NUDGE_CM)
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  nudgeWidthCm(-METER_FIELD_NUDGE_CM)
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  commitWidthM()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            <MeterArrowButtons
              onUp={() => nudgeWidthCm(METER_FIELD_NUDGE_CM)}
              onDown={() => nudgeWidthCm(-METER_FIELD_NUDGE_CM)}
            />
            <span className="text-xs text-light/40 shrink-0">m</span>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="ui-label">Diepte (m)</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              className="ui-input text-sm py-1.5 flex-1 min-w-0 tabular-nums"
              title="Diepte in meters (bijv. 3,00); pijltjes omhoog/omlaag: ±5 cm"
              value={depthDraftM !== null ? depthDraftM : formatNlDecimal(roomDepth / 100, 2)}
              onFocus={() => setDepthDraftM(formatNlDecimal(roomDepth / 100, 2))}
              onChange={e => setDepthDraftM(e.target.value)}
              onBlur={commitDepthM}
              onKeyDown={e => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  nudgeDepthCm(METER_FIELD_NUDGE_CM)
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  nudgeDepthCm(-METER_FIELD_NUDGE_CM)
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  commitDepthM()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            <MeterArrowButtons
              onUp={() => nudgeDepthCm(METER_FIELD_NUDGE_CM)}
              onDown={() => nudgeDepthCm(-METER_FIELD_NUDGE_CM)}
            />
            <span className="text-xs text-light/40 shrink-0">m</span>
          </div>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="ui-label">Naam ruimte</span>
        <input type="text" className="ui-input text-sm py-1.5" value={roomName} placeholder="bijv. Woonkamer"
          onChange={e => setRoomName(e.target.value)} />
      </label>

      {/* Wall height — uniform / per-wall */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="ui-label">Wandhoogte</span>
          <div className="flex rounded-md border border-dark-border overflow-hidden text-[10px]">
            <button
              type="button"
              onClick={handleSwitchToUniform}
              className={[
                'px-2 py-0.5 transition-colors',
                wallHeightMode === 'uniform'
                  ? 'bg-accent text-white'
                  : 'text-light/50 hover:text-light',
              ].join(' ')}
            >
              Gelijk
            </button>
            <button
              type="button"
              onClick={handleSwitchToPerWall}
              className={[
                'px-2 py-0.5 border-l border-dark-border transition-colors',
                wallHeightMode === 'per-wall'
                  ? 'bg-accent text-white'
                  : 'text-light/50 hover:text-light',
              ].join(' ')}
            >
              Per wand
            </button>
          </div>
        </div>

        {wallHeightMode === 'uniform' ? (
          <div className="flex items-center gap-2">
            <input type="number" className="ui-input text-sm py-1.5 flex-1" value={wallHeight} min={100} max={600}
              onChange={e => setWallHeight(Number(e.target.value))} />
            <span className="text-xs text-light/40 shrink-0">cm</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {Array.from({ length: previewVertices.length }, (_, i) => (
              <label key={i} className="flex items-center gap-1">
                <span className="text-[10px] text-light/50 w-6 shrink-0">W{i + 1}</span>
                <input
                  type="number"
                  className="ui-input text-xs py-1 flex-1 min-w-0"
                  value={perWallHeights[i] ?? wallHeight}
                  min={100}
                  max={600}
                  onChange={e => {
                    const next = [...perWallHeights]
                    next[i] = Number(e.target.value)
                    setPerWallHeights(next)
                  }}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Roof type */}
      <label className="flex flex-col gap-1">
        <span className="ui-label">Daktype</span>
        <div className="grid grid-cols-3 gap-1.5">
          {ROOF_OPTIONS.map(roof => (
            <button
              key={roof.id}
              type="button"
              onClick={() => setRoofType(roof.id)}
              className={[
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all duration-150',
                roofType === roof.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark text-light/50 hover:text-light hover:border-accent/40',
              ].join(' ')}
            >
              <span className="text-base leading-none">{roof.icon}</span>
              <span className="text-[9px]">{roof.label}</span>
            </button>
          ))}
        </div>
      </label>

      {showPeakHeight && (
        <label className="flex flex-col gap-1">
          <span className="ui-label">Dakoverstijging (cm)</span>
          <input
            type="number"
            className="ui-input text-sm py-1.5"
            value={roofPeakHeight}
            min={10}
            max={1000}
            onChange={e => setRoofPeakHeight(Number(e.target.value))}
          />
          <span className="text-[10px] text-light/30">
            Hoogte boven de muren tot het hoogste punt
          </span>
        </label>
      )}

      {/* Ceiling type */}
      <div className="flex flex-col gap-1.5">
        <span className="ui-label">Plafondtype</span>
        <div className="grid grid-cols-3 gap-1.5">
          {CEILING_OPTIONS.slice(0, 3).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCeilingType(c.id)}
              className={[
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all duration-150',
                ceilingType === c.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark text-light/50 hover:text-light hover:border-accent/40',
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
              onClick={() => setCeilingType(c.id)}
              className={[
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all duration-150',
                ceilingType === c.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark text-light/50 hover:text-light hover:border-accent/40',
              ].join(' ')}
            >
              <span className="text-base leading-none">{c.icon}</span>
              <span className="text-[9px]">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Ceiling height inputs */}
        {ceilingNeedsRidge ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="ui-label">Hoogte laag (cm)</span>
              <input type="number" className="ui-input text-xs py-1" value={ceilingHeight} min={100} max={600}
                onChange={e => setCeilingHeight(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="ui-label">Hoogte hoog (cm)</span>
              <input type="number" className="ui-input text-xs py-1" value={ceilingRidgeHeight} min={100} max={1000}
                onChange={e => setCeilingRidgeHeight(Number(e.target.value))} />
            </label>
          </div>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="ui-label">Plafond hoogte (cm)</span>
            <input type="number" className="ui-input text-xs py-1" value={ceilingHeight} min={100} max={600}
              onChange={e => setCeilingHeight(Number(e.target.value))} />
          </label>
        )}

        {ceilingType === 'cassette' && (
          <label className="flex flex-col gap-1">
            <span className="ui-label">Cassette raster</span>
            <select
              className="ui-input text-xs py-1"
              value={cassetteGrid}
              onChange={e => setCassetteGrid(e.target.value)}
            >
              {CASSETTE_GRIDS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <button
        onClick={handlePlace}
        className="w-full mt-1 px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg
          hover:bg-accent/90 transition-colors"
      >
        Plaatsen op plattegrond ↓
      </button>
    </div>
  )
}
