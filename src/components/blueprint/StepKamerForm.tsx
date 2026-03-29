import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { RotateCw } from 'lucide-react'
import { blueprintStore } from '../../store/blueprintStore'
import {
  axisAlignedBBoxCentre,
  axisAlignedBBoxSize,
  generateShapeVertices,
  rotateRoomPolygon90CCW,
  rotateRoomPolygon90CW,
  translatePolygon,
  worldPointAtBlueprintStageCentre,
} from '../../utils/blueprintGeometry'
import type { Point, ShapeType } from '../../utils/blueprintGeometry'
import RoomShapePicker from './RoomShapePicker'
import { DEFAULT_ROOM_WALL_HEIGHT_CM } from './roomStructureHelpers'
import { useRoomDetailsStore } from '../../store/roomDetailsStore'
import { RUIMTE_FUNCTIE_OPTIONS } from '../../utils/ruimteFunctiePlanStyle'
import { suggestedRoomNameForFunctie } from '../../utils/roomDefaultName'

/** 90° CW in schermcoördinaten (y naar beneden): (x,y) → (-y, x) per stap. */
function rotateVerticesBySteps(verts: Point[], steps: number): Point[] {
  let v = verts
  for (let i = 0; i < ((steps % 4) + 4) % 4; i++) {
    v = v.map(p => ({ x: -p.y, y: p.x }))
  }
  return v
}

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
  /** Suggested name for a new room (e.g. Kamer 1); remount key usually refreshes this. */
  defaultRoomName?: string
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
  defaultRoomName = '',
}: StepKamerFormProps) {
  const [shape, setShape] = useState<ShapeType>('rechthoek')
  const [localWidth, setLocalWidth] = useState(controlledWidth ?? 400)
  const [localDepth, setLocalDepth] = useState(controlledDepth ?? 300)

  const roomWidth = editRoomId ? localWidth : (controlledWidth ?? localWidth)
  const roomDepth = editRoomId ? localDepth : (controlledDepth ?? localDepth)

  const [roomName, setRoomName] = useState(defaultRoomName)
  /** Voor plaatsing: functie wordt na addRoom in roomDetails gezet. */
  const [pendingRuimteFunctie, setPendingRuimteFunctie] = useState('')

  const setRuimteFunctie = useRoomDetailsStore(s => s.setRuimteFunctie)
  const ruimteFunctieStored = useRoomDetailsStore(s =>
    editRoomId ? (s.details[editRoomId]?.ruimteFunctie ?? '') : '',
  )

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

  /** Edit mode: naam in de store. */
  const applyEditMeta = useCallback((updates: { name?: string }) => {
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

    /** Midden van de plattegrond-view: na pannen staat (0,0) niet meer in het midden; plaats daarom onder het canvas-midden. */
    const doc = blueprintStore.getState()
    const { width: cw, height: ch } = doc.canvasSize
    const vp = doc.viewport
    let placedVertices = vertices
    if (cw > 0 && ch > 0 && vp.scale > 0) {
      const aim = worldPointAtBlueprintStageCentre(cw, ch, vp)
      const cur = axisAlignedBBoxCentre(vertices)
      if (cur) {
        placedVertices = translatePolygon(vertices, aim.x - cur.x, aim.y - cur.y)
      }
    }

    const { w: planWidthCm, h: planDepthCm } = axisAlignedBBoxSize(placedVertices)

    const details = useRoomDetailsStore.getState().details
    const fallbackName = suggestedRoomNameForFunctie(
      pendingRuimteFunctie,
      doc.roomOrder,
      doc.rooms,
      details,
      null,
    )
    const id = blueprintStore.getState().addRoom(placedVertices, {
      name: roomName.trim() || fallbackName,
      shape,
      planWidthCm,
      planDepthCm,
      ceiling: { type: 'vlak', height: DEFAULT_ROOM_WALL_HEIGHT_CM },
    })
    setRuimteFunctie(id, pendingRuimteFunctie)
    blueprintStore.getState().select([id])
    onNext(id)
  }, [
    currentPreviewVertices,
    shape,
    roomWidth,
    roomDepth,
    roomName,
    onNext,
    parentPreviewVertices,
    pendingRuimteFunctie,
    setRuimteFunctie,
  ])

  // ─── Shared render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

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

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            if (editRoomId) {
              const room = blueprintStore.getState().rooms[editRoomId]
              if (room) {
                const newVerts = rotateRoomPolygon90CCW(room.vertices)
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
              onCanvasPreviewChange?.(rotateRoomPolygon90CCW(parentPreviewVertices))
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
                const newVerts = rotateRoomPolygon90CW(room.vertices)
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
              onCanvasPreviewChange?.(rotateRoomPolygon90CW(parentPreviewVertices))
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
        <span className="ui-label">Functie van deze kamer</span>
        <select
          className="ui-input text-sm py-1.5"
          value={editRoomId ? ruimteFunctieStored : pendingRuimteFunctie}
          onChange={e => {
            const v = e.target.value
            if (editRoomId) {
              setRuimteFunctie(editRoomId, v)
            } else {
              setPendingRuimteFunctie(v)
            }
            const doc = blueprintStore.getState()
            const details = useRoomDetailsStore.getState().details
            const name = suggestedRoomNameForFunctie(
              v,
              doc.roomOrder,
              doc.rooms,
              details,
              editRoomId ?? null,
            )
            setRoomName(name)
            if (editRoomId) applyEditMeta({ name })
          }}
        >
          {RUIMTE_FUNCTIE_OPTIONS.map(opt => (
            <option key={opt.value || '—'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="ui-label">Naam</span>
        <input
          type="text"
          className="ui-input text-sm py-1.5"
          value={roomName}
          placeholder={defaultRoomName || 'Kamer 1'}
          onChange={e => setRoomName(e.target.value)}
          onBlur={e => {
            if (!editRoomId) return
            const name = e.target.value
            const room = blueprintStore.getState().rooms[editRoomId]
            if (room && room.name !== name) applyEditMeta({ name })
          }}
        />
      </label>

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
    </div>
  )
}
