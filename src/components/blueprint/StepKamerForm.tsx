import { useState, useCallback, useMemo, useEffect } from 'react'
import { blueprintStore } from '../../store/blueprintStore'
import {
  generateShapeVertices,
} from '../../utils/blueprintGeometry'
import type { Point, ShapeType, RoofType } from '../../utils/blueprintGeometry'
import type { RoomCeiling } from '../../store/blueprintStore'
import RoomShapePicker from './RoomShapePicker'

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
}

export default function StepKamerForm({
  onNext,
  onPreviewChange,
  controlledWidth,
  controlledDepth,
  onWidthChange,
  onDepthChange,
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

  const previewVertices = useMemo(
    () => (shape === 'vrije-vorm' ? [] : generateShapeVertices(shape, roomWidth, roomDepth)),
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
    if (shape === 'vrije-vorm') {
      blueprintStore.getState().setActiveTool('draw')
      return
    }
    const vertices = generateShapeVertices(shape, roomWidth, roomDepth)
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
      roofType,
      roofPeakHeight,
      ...(wallHeightMode === 'per-wall' ? { wallHeights: perWallHeights } : {}),
      ceiling,
    })
    blueprintStore.getState().select([id])
    onNext(id)
  }, [
    shape, roomWidth, roomDepth, roomName, wallHeight, roofType, roofPeakHeight,
    wallHeightMode, perWallHeights, ceilingType, ceilingHeight, ceilingRidgeHeight,
    cassetteGrid, onNext,
  ])

  const showPeakHeight = roofType !== 'plat' && roofType !== 'platband'
  const ceilingNeedsRidge = ceilingType === 'schuin' || ceilingType === 'gewelfd' || ceilingType === 'open-kap'

  if (shape === 'vrije-vorm') {
    return (
      <div className="space-y-3">
        <RoomShapePicker selected={shape} onSelect={setShape} />
        <p className="text-[11px] text-accent/80 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
          Klik op de canvas om punten te plaatsen. Dubbelklik om de vorm te sluiten.
        </p>
        <button
          onClick={handlePlace}
          className="w-full mt-1 px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg
            hover:bg-accent/90 transition-colors"
        >
          Tekenmodus starten ↓
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <RoomShapePicker selected={shape} onSelect={setShape} />

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="ui-label">Breedte (cm)</span>
          <input type="number" className="ui-input text-sm py-1.5" value={roomWidth} min={50} max={5000}
            onChange={e => setRoomWidth(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ui-label">Diepte (cm)</span>
          <input type="number" className="ui-input text-sm py-1.5" value={roomDepth} min={50} max={5000}
            onChange={e => setRoomDepth(Number(e.target.value))} />
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
