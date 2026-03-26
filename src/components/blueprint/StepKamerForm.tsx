import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { RotateCw } from 'lucide-react'
import { blueprintStore } from '../../store/blueprintStore'
import {
  axisAlignedBBoxSize,
  generateShapeVertices,
} from '../../utils/blueprintGeometry'
import type { Point, ShapeType, RoofType } from '../../utils/blueprintGeometry'
import type { RoomCeiling } from '../../store/blueprintStore'
import RoomShapePicker from './RoomShapePicker'

/** 90° CW in schermcoördinaten (y naar beneden): (x,y) → (-y, x) per stap. */
function rotateVerticesBySteps(verts: Point[], steps: number): Point[] {
  let v = verts
  for (let i = 0; i < ((steps % 4) + 4) % 4; i++) {
    v = v.map(p => ({ x: -p.y, y: p.x }))
  }
  return v
}

function rotateVertices90CW(verts: Point[]): Point[] {
  return verts.map(p => ({ x: -p.y, y: p.x }))
}

function rotateVertices90CCW(verts: Point[]): Point[] {
  return verts.map(p => ({ x: p.y, y: -p.x }))
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
  /** BlueprintPage `previewVertices` — canvas + form single source of truth for placement. */
  parentPreviewVertices?: Point[]
  /** True if user dragged preview / edited walls — rotate must transform vertices, not reset to preset. */
  canvasPreviewEdited?: boolean
  onCanvasPreviewChange?: (vertices: Point[]) => void
  /** When set, the form is in edit mode for an existing placed room. */
  editRoomId?: string | null
}

export default function StepKamerForm({
  onNext,
  onPreviewChange,
  onCanvasPreviewChange,
  canvasPreviewEdited = false,
  controlledWidth,
  controlledDepth,
  onWidthChange,
  onDepthChange,
  currentPreviewVertices,
  parentPreviewVertices,
  editRoomId,
}: StepKamerFormProps) {
  const [shape, setShape] = useState<ShapeType>('rechthoek')
  const [localWidth, setLocalWidth] = useState(controlledWidth ?? 400)
  const [localDepth, setLocalDepth] = useState(controlledDepth ?? 300)

  const roomWidth = editRoomId ? localWidth : (controlledWidth ?? localWidth)
  const roomDepth = editRoomId ? localDepth : (controlledDepth ?? localDepth)

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

  const [rotationSteps, setRotationSteps] = useState(0) // 0–3, elke stap = 90° CW (alleen preset-modus)
  const rotationStepsRef = useRef(rotationSteps)
  rotationStepsRef.current = rotationSteps

  // ─── Edit mode: load room data when editRoomId changes ─────────────────

  useEffect(() => {
    if (!editRoomId) return
    const room = blueprintStore.getState().rooms[editRoomId]
    if (!room) return

    setShape((room.shape as ShapeType | undefined) ?? 'rechthoek')
    const w = room.planWidthCm ?? axisAlignedBBoxSize(room.vertices).w
    const h = room.planDepthCm ?? axisAlignedBBoxSize(room.vertices).h
    setLocalWidth(w)
    setLocalDepth(h)
    setRoomName(room.name)
    setWallHeight(room.wallHeight)
    setRoofType(room.roofType)
    setRoofPeakHeight(room.roofPeakHeight ?? 150)

    if (room.wallHeights && room.wallHeights.length > 0) {
      setWallHeightMode('per-wall')
      setPerWallHeights(room.wallHeights)
    } else {
      setWallHeightMode('uniform')
      setPerWallHeights([])
    }

    if (room.ceiling) {
      setCeilingType(room.ceiling.type)
      setCeilingHeight(room.ceiling.height)
      if (room.ceiling.ridgeHeight != null) setCeilingRidgeHeight(room.ceiling.ridgeHeight)
      if (room.ceiling.cassetteGrid) setCassetteGrid(room.ceiling.cassetteGrid)
    } else {
      setCeilingType('vlak')
      setCeilingHeight(250)
    }

    setRotationSteps(0)
  }, [editRoomId])

  // ─── Non-edit mode: sync controlled width/depth from parent (preview canvas drag etc.) ───

  useEffect(() => {
    if (editRoomId) return
    if (controlledWidth !== undefined) setLocalWidth(controlledWidth)
  }, [controlledWidth, editRoomId])

  useEffect(() => {
    if (editRoomId) return
    if (controlledDepth !== undefined) setLocalDepth(controlledDepth)
  }, [controlledDepth, editRoomId])

  // ─── Edit mode: apply dimension/shape change to the placed room ─────────

  /**
   * Scales or regenerates the room's vertices while keeping the room centred at
   * its current world position.  All arithmetic is relative to the centroid so
   * neither scaling nor shape-changes move the room on the plattegrond.
   * Single store update → single undo entry.
   */
  const applyEditDimensions = useCallback((newShape: ShapeType, newW: number, newD: number) => {
    if (!editRoomId) return
    const room = blueprintStore.getState().rooms[editRoomId]
    if (!room) return

    const { w: oldW, h: oldH } = axisAlignedBBoxSize(room.vertices)
    const shapeChanged = newShape !== ((room.shape as ShapeType | undefined) ?? 'rechthoek')
    const curW = room.planWidthCm ?? oldW
    const curH = room.planDepthCm ?? oldH
    if (
      !shapeChanged &&
      Math.round(newW) === Math.round(curW) &&
      Math.round(newD) === Math.round(curH)
    ) {
      return
    }

    // Preserve the current centroid so the room doesn't jump on the plattegrond
    const n = room.vertices.length
    const cx = room.vertices.reduce((s, v) => s + v.x, 0) / n
    const cy = room.vertices.reduce((s, v) => s + v.y, 0) / n

    let newVertices: Point[]
    if (shapeChanged || oldW <= 0 || oldH <= 0) {
      // Regenerate from shape preset (vertices at origin) then translate to centroid
      const raw = generateShapeVertices(newShape, newW, newD)
      newVertices = raw.map(v => ({ x: v.x + cx, y: v.y + cy }))
    } else {
      // Scale each vertex relative to centroid so the room stays in place
      newVertices = room.vertices.map(v => ({
        x: cx + (v.x - cx) * (newW / oldW),
        y: cy + (v.y - cy) * (newD / oldH),
      }))
    }

    const bbox = axisAlignedBBoxSize(newVertices)
    blueprintStore.getState().updateRoom(editRoomId, {
      shape: newShape,
      vertices: newVertices,
      planWidthCm: bbox.w,
      planDepthCm: bbox.h,
    })
  }, [editRoomId])

  /** Edit mode: update non-geometry room metadata in the store. */
  const applyEditMeta = useCallback((updates: {
    name?: string
    wallHeight?: number
    wallHeights?: number[]
    roofType?: RoofType
    roofPeakHeight?: number
    ceiling?: RoomCeiling
  }) => {
    if (!editRoomId) return
    blueprintStore.getState().updateRoom(editRoomId, updates)
  }, [editRoomId])

  const generatedBase = useMemo(
    () => generateShapeVertices(shape, roomWidth, roomDepth),
    [shape, roomWidth, roomDepth],
  )

  const formRotated = useMemo(
    () => rotateVerticesBySteps(generatedBase, rotationSteps),
    [generatedBase, rotationSteps],
  )

  /** Wat we tonen: parent (canvas + canvas-rotatie) of preset uit het formulier. */
  const previewVertices =
    parentPreviewVertices && parentPreviewVertices.length >= 3
      ? parentPreviewVertices
      : formRotated

  // Sync preset vanuit formulier — niet tijdens canvas-sleep en niet in edit mode.
  useEffect(() => {
    if (editRoomId) return
    if (canvasPreviewEdited) return
    onPreviewChange?.(
      rotateVerticesBySteps(
        generateShapeVertices(shape, roomWidth, roomDepth),
        rotationStepsRef.current,
      ),
    )
  }, [shape, roomWidth, roomDepth, onPreviewChange, canvasPreviewEdited, editRoomId])

  // Alleen preset-modus: rotatie via steps syncen.
  useEffect(() => {
    if (editRoomId) return
    if (canvasPreviewEdited) return
    onPreviewChange?.(formRotated)
  }, [canvasPreviewEdited, formRotated, onPreviewChange, editRoomId])

  const handleSwitchToPerWall = () => {
    const newHeights = Array(previewVertices.length).fill(wallHeight)
    setPerWallHeights(newHeights)
    setWallHeightMode('per-wall')
    if (editRoomId) applyEditMeta({ wallHeights: newHeights })
  }

  const handleSwitchToUniform = () => {
    setWallHeightMode('uniform')
    if (editRoomId) applyEditMeta({ wallHeights: [] })
  }

  // ─── Ceiling helper ───────────────────────────────────────────────────────

  const buildCeiling = (
    type: RoomCeiling['type'],
    height: number,
    ridgeHeight: number,
    grid: string,
  ): RoomCeiling => ({
    type,
    height,
    ...(type !== 'vlak' && type !== 'cassette' ? { ridgeHeight } : {}),
    ...(type === 'cassette' ? { cassetteGrid: grid } : {}),
  })

  // ─── Add mode: place new room ─────────────────────────────────────────────

  const handlePlace = useCallback(() => {
    /** BlueprintPage-preview wint; anders BuilderPanel-state; anders preset. */
    const vertices =
      parentPreviewVertices && parentPreviewVertices.length >= 3
        ? parentPreviewVertices
        : currentPreviewVertices && currentPreviewVertices.length >= 3
          ? currentPreviewVertices
          : generateShapeVertices(shape, roomWidth, roomDepth)
    if (vertices.length < 3) return

    const { w: planWidthCm, h: planDepthCm } = axisAlignedBBoxSize(vertices)

    const ceiling: RoomCeiling = buildCeiling(ceilingType, ceilingHeight, ceilingRidgeHeight, cassetteGrid)

    const id = blueprintStore.getState().addRoom(vertices, {
      name: roomName || 'Ruimte',
      wallHeight,
      shape,
      planWidthCm,
      planDepthCm,
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
    cassetteGrid, onNext, parentPreviewVertices,
  ])

  const showPeakHeight = roofType !== 'plat' && roofType !== 'platband'
  const ceilingNeedsRidge = ceilingType === 'schuin' || ceilingType === 'gewelfd' || ceilingType === 'open-kap'

  // ─── Shared render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Edit mode indicator */}
      {editRoomId && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-2 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">Kamer bewerken</span>
        </div>
      )}

      <RoomShapePicker
        selected={shape}
        onSelect={s => {
          setShape(s)
          setRotationSteps(0)
          if (editRoomId) {
            applyEditDimensions(s, roomWidth, roomDepth)
          } else {
            onPreviewChange?.(rotateVerticesBySteps(generateShapeVertices(s, roomWidth, roomDepth), 0))
          }
        }}
      />

      {/* Breedte / Diepte */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="ui-label">Breedte (cm)</span>
          <input
            type="number"
            className="ui-input text-sm py-1.5"
            value={Math.round(localWidth)}
            min={10}
            max={10000}
            onChange={e => {
              const v = Number(e.target.value)
              setLocalWidth(v)
              if (!editRoomId) onWidthChange?.(v)
            }}
            onBlur={e => {
              const v = Math.max(10, Number(e.target.value))
              setLocalWidth(v)
              if (editRoomId) {
                applyEditDimensions(shape, v, localDepth)
              } else {
                onPreviewChange?.(rotateVerticesBySteps(generateShapeVertices(shape, v, localDepth), rotationStepsRef.current))
              }
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ui-label">Diepte (cm)</span>
          <input
            type="number"
            className="ui-input text-sm py-1.5"
            value={Math.round(localDepth)}
            min={10}
            max={10000}
            onChange={e => {
              const v = Number(e.target.value)
              setLocalDepth(v)
              if (!editRoomId) onDepthChange?.(v)
            }}
            onBlur={e => {
              const v = Math.max(10, Number(e.target.value))
              setLocalDepth(v)
              if (editRoomId) {
                applyEditDimensions(shape, localWidth, v)
              } else {
                onPreviewChange?.(rotateVerticesBySteps(generateShapeVertices(shape, localWidth, v), rotationStepsRef.current))
              }
            }}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            if (editRoomId) {
              const room = blueprintStore.getState().rooms[editRoomId]
              if (room) {
                // Rotate around centroid so the room stays in place on the plattegrond
                const n = room.vertices.length
                const cx = room.vertices.reduce((s, v) => s + v.x, 0) / n
                const cy = room.vertices.reduce((s, v) => s + v.y, 0) / n
                const newVerts = room.vertices.map(v => {
                  const dx = v.x - cx; const dy = v.y - cy
                  return { x: cx + dy, y: cy - dx } // 90° CCW around centroid
                })
                const bbox = axisAlignedBBoxSize(newVerts)
                blueprintStore.getState().updateRoom(editRoomId, {
                  vertices: newVerts,
                  planWidthCm: bbox.w,
                  planDepthCm: bbox.h,
                })
                setLocalWidth(bbox.w)
                setLocalDepth(bbox.h)
              }
            } else if (canvasPreviewEdited && parentPreviewVertices && parentPreviewVertices.length >= 3) {
              onCanvasPreviewChange?.(rotateVertices90CCW(parentPreviewVertices))
            } else {
              setRotationSteps(prev => (prev + 3) % 4)
            }
          }}
          title="Links draaien"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dark-border px-3 py-2 text-xs text-neutral-400 transition-all duration-150 hover:border-accent/40 hover:text-neutral-200 theme-light:border-neutral-300 theme-light:bg-white theme-light:text-neutral-600 theme-light:hover:text-neutral-900"
        >
          <RotateCw size={12} className="shrink-0 -scale-x-100" />
          Links
        </button>
        <button
          type="button"
          onClick={() => {
            if (editRoomId) {
              const room = blueprintStore.getState().rooms[editRoomId]
              if (room) {
                // Rotate around centroid so the room stays in place on the plattegrond
                const n = room.vertices.length
                const cx = room.vertices.reduce((s, v) => s + v.x, 0) / n
                const cy = room.vertices.reduce((s, v) => s + v.y, 0) / n
                const newVerts = room.vertices.map(v => {
                  const dx = v.x - cx; const dy = v.y - cy
                  return { x: cx - dy, y: cy + dx } // 90° CW around centroid
                })
                const bbox = axisAlignedBBoxSize(newVerts)
                blueprintStore.getState().updateRoom(editRoomId, {
                  vertices: newVerts,
                  planWidthCm: bbox.w,
                  planDepthCm: bbox.h,
                })
                setLocalWidth(bbox.w)
                setLocalDepth(bbox.h)
              }
            } else if (canvasPreviewEdited && parentPreviewVertices && parentPreviewVertices.length >= 3) {
              onCanvasPreviewChange?.(rotateVertices90CW(parentPreviewVertices))
            } else {
              setRotationSteps(prev => (prev + 1) % 4)
            }
          }}
          title="Rechts draaien"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dark-border px-3 py-2 text-xs text-neutral-400 transition-all duration-150 hover:border-accent/40 hover:text-neutral-200 theme-light:border-neutral-300 theme-light:bg-white theme-light:text-neutral-600 theme-light:hover:text-neutral-900"
        >
          <RotateCw size={12} className="shrink-0" />
          Rechts
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="ui-label">Naam</span>
        <input
          type="text"
          className="ui-input text-sm py-1.5"
          value={roomName}
          placeholder="bijv. Woonkamer"
          onChange={e => setRoomName(e.target.value)}
          onBlur={e => {
            if (!editRoomId) return
            const name = e.target.value
            const room = blueprintStore.getState().rooms[editRoomId]
            if (room && room.name !== name) applyEditMeta({ name })
          }}
        />
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
                  : 'text-neutral-400 hover:text-neutral-200 theme-light:text-neutral-600 theme-light:hover:text-neutral-900',
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
                  : 'text-neutral-400 hover:text-neutral-200 theme-light:text-neutral-600 theme-light:hover:text-neutral-900',
              ].join(' ')}
            >
              Per wand
            </button>
          </div>
        </div>

        {wallHeightMode === 'uniform' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="ui-input text-sm py-1.5 flex-1"
              value={wallHeight}
              min={100}
              max={600}
              onChange={e => {
                const v = Number(e.target.value)
                setWallHeight(v)
                if (editRoomId) applyEditMeta({ wallHeight: v })
              }}
            />
            <span className="shrink-0 text-xs text-neutral-500 theme-light:text-neutral-600">cm</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {Array.from({ length: previewVertices.length }, (_, i) => (
              <label key={i} className="flex items-center gap-1">
                <span className="w-6 shrink-0 text-[10px] text-neutral-500 theme-light:text-neutral-600">
                  W{i + 1}
                </span>
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
                    if (editRoomId) applyEditMeta({ wallHeights: next })
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
              onClick={() => {
                setRoofType(roof.id)
                if (editRoomId) applyEditMeta({ roofType: roof.id })
              }}
              className={[
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all duration-150',
                roofType === roof.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark text-neutral-400 hover:border-accent/40 hover:text-neutral-200 theme-light:border-neutral-300 theme-light:bg-neutral-50 theme-light:text-neutral-700 theme-light:hover:text-neutral-900',
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
            onChange={e => {
              const v = Number(e.target.value)
              setRoofPeakHeight(v)
              if (editRoomId) applyEditMeta({ roofPeakHeight: v })
            }}
          />
          <span className="text-[10px] text-neutral-500 theme-light:text-neutral-600">
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
              onClick={() => {
                setCeilingType(c.id)
                if (editRoomId) applyEditMeta({ ceiling: buildCeiling(c.id, ceilingHeight, ceilingRidgeHeight, cassetteGrid) })
              }}
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
              onClick={() => {
                setCeilingType(c.id)
                if (editRoomId) applyEditMeta({ ceiling: buildCeiling(c.id, ceilingHeight, ceilingRidgeHeight, cassetteGrid) })
              }}
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

        {/* Ceiling height inputs */}
        {ceilingNeedsRidge ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="ui-label">Hoogte laag (cm)</span>
              <input
                type="number"
                className="ui-input text-xs py-1"
                value={ceilingHeight}
                min={100}
                max={600}
                onChange={e => {
                  const v = Number(e.target.value)
                  setCeilingHeight(v)
                  if (editRoomId) applyEditMeta({ ceiling: buildCeiling(ceilingType, v, ceilingRidgeHeight, cassetteGrid) })
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="ui-label">Hoogte hoog (cm)</span>
              <input
                type="number"
                className="ui-input text-xs py-1"
                value={ceilingRidgeHeight}
                min={100}
                max={1000}
                onChange={e => {
                  const v = Number(e.target.value)
                  setCeilingRidgeHeight(v)
                  if (editRoomId) applyEditMeta({ ceiling: buildCeiling(ceilingType, ceilingHeight, v, cassetteGrid) })
                }}
              />
            </label>
          </div>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="ui-label">Plafond hoogte (cm)</span>
            <input
              type="number"
              className="ui-input text-xs py-1"
              value={ceilingHeight}
              min={100}
              max={600}
              onChange={e => {
                const v = Number(e.target.value)
                setCeilingHeight(v)
                if (editRoomId) applyEditMeta({ ceiling: buildCeiling(ceilingType, v, ceilingRidgeHeight, cassetteGrid) })
              }}
            />
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
                if (editRoomId) applyEditMeta({ ceiling: buildCeiling(ceilingType, ceilingHeight, ceilingRidgeHeight, v) })
              }}
            >
              {CASSETTE_GRIDS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Add mode: place button. Edit mode: changes are live — no button needed. */}
      {!editRoomId && (
        <button
          onClick={handlePlace}
          className="w-full mt-1 px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg
            hover:bg-accent/90 transition-colors"
        >
          Plaatsen op plattegrond ↓
        </button>
      )}

      {editRoomId && (
        <p className="pt-1 text-center text-[10px] text-neutral-500 theme-light:text-neutral-600">
          Wijzigingen worden direct doorgevoerd op de plattegrond.
        </p>
      )}
    </div>
  )
}
