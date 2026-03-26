import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import { nanoid } from 'nanoid'
import {
  applyWallLengthRespectingLocks,
  axisAlignedBBoxSize,
  snapPointToGrid,
  type Point,
  type RoomShapeStored,
  type RoofType,
} from '../utils/blueprintGeometry'

export type { Point }

// ─── Domain types ──────────────────────────────────────────────────────────

export interface RoomCeiling {
  type: 'vlak' | 'schuin' | 'cassette' | 'gewelfd' | 'open-kap'
  height: number
  ridgeHeight?: number
  cassetteGrid?: string
}

export interface Room {
  id: string
  name: string
  vertices: Point[]
  fill: string
  wallHeight: number
  label?: string
  shape?: RoomShapeStored
  /** Nominale breedte/diepte (cm) voor dezelfde preview-schaal bij alle vormen; wordt bij vertex-updates gesynchroniseerd. */
  planWidthCm?: number
  planDepthCm?: number
  /** Vergrendeld: wand kan niet worden gesleept en de lengte blijft behouden. */
  lockedWalls: number[]
  roofType: RoofType
  roofPeakHeight?: number
  wallHeights?: number[]
  ceiling?: RoomCeiling
}

export type ElementType = 'deur' | 'raam' | 'trap' | 'kast' | 'overig'

export interface FloorElement {
  id: string
  type: ElementType
  roomId: string
  wallIndex: number
  wallOffset: number
  width: number
  rotation: number
  label?: string
}

export type ActiveTool =
  | 'select'
  | 'draw'
  | 'write'
  | 'measure'
  | 'pan'
  | 'add-deur'
  | 'add-raam'
  | 'add-trap'
  | 'add-kast'
  | 'add-overig'

/** Vrije tekst op de plattegrond (wereldcoördinaten in cm). */
export interface CanvasTextNote {
  id: string
  x: number
  y: number
  text: string
}

/** Opgeslagen meetlijn (wereldcoördinaten in cm). */
export interface MeasureLineEntity {
  id: string
  start: Point
  end: Point
}

export interface Viewport {
  x: number
  y: number
  scale: number
}

export interface SnapGuide {
  points: [number, number, number, number]
}

// ─── Partialised (undo-able) document state ────────────────────────────────

export interface BlueprintDoc {
  rooms: Record<string, Room>
  roomOrder: string[]
  elements: Record<string, FloorElement>
  canvasTextNotes: Record<string, CanvasTextNote>
  canvasTextNoteOrder: string[]
  measureLines: MeasureLineEntity[]
}

// ─── Full store state ──────────────────────────────────────────────────────

interface BlueprintState extends BlueprintDoc {
  // Ephemeral — not in undo history
  projectId: string | null
  selectedIds: string[]
  /** Geselecteerde plattegrond-tekst (los van kamers). */
  selectedCanvasTextNoteId: string | null
  /** Welke tekstnotitie toont de HTML-editor (overlay). */
  editingCanvasTextNoteId: string | null
  activeTool: ActiveTool
  snapEnabled: boolean
  gridEnabled: boolean
  /** Eén polylijn per mousedown–mouseup; geen lijn tussen twee strokes. */
  drawingStrokes: Point[][]
  /** Selectiemodus: welke preview-strook (index in drawingStrokes) is geselecteerd voor Delete. */
  selectedDrawingStrokeIndex: number | null
  /** Geselecteerde meetlijn (Delete). */
  selectedMeasureLineId: string | null
  /** Eerste klik + live hover voor klik–klik–meten (alleen bij meet-tool). */
  measureDraft: { start: Point; hover: Point } | null
  viewport: Viewport
  activeRoomDraft: Partial<Room> | null
  snapGuides: SnapGuide[]
  canvasSize: { width: number; height: number }

  // Actions — document (undo-able)
  addRoom: (vertices: Point[], meta?: Partial<Omit<Room, 'id' | 'vertices'>>) => string
  updateRoomVertices: (id: string, vertices: Point[]) => void
  updateRoomVertex: (id: string, index: number, point: Point) => void
  updateRoom: (id: string, updates: Partial<Room>) => void
  deleteRoom: (id: string) => void
  addElement: (el: Omit<FloorElement, 'id'>) => string
  updateElement: (id: string, updates: Partial<FloorElement>) => void
  deleteElement: (id: string) => void
  addCanvasTextNote: (point: Point) => string
  updateCanvasTextNote: (id: string, updates: Partial<Pick<CanvasTextNote, 'text' | 'x' | 'y'>>) => void
  deleteCanvasTextNote: (id: string) => void
  /** Alleen selectie (rand), geen teksteditor — voor selectiemodus + Delete. */
  selectCanvasTextNote: (id: string) => void
  /** Selectie + teksteditor openen (schrijf-tool of dubbelklik). */
  openCanvasTextNoteEditor: (id: string) => void
  setEditingCanvasTextNoteId: (id: string | null) => void
  toggleWallLock: (roomId: string, wallIndex: number) => void
  setWallLength: (roomId: string, wallIndex: number, lengthCm: number) => void
  setRoofType: (roomId: string, type: RoofType, peakHeight?: number) => void
  addMeasureLine: (start: Point, end: Point) => string
  deleteMeasureLine: (id: string) => void
  selectMeasureLine: (id: string | null) => void
  setMeasureDraft: (draft: { start: Point; hover: Point } | null) => void
  clearMeasureDraft: () => void

  // Actions — ephemeral
  initProject: (projectId: string) => void
  select: (ids: string[]) => void
  clearSelection: () => void
  setActiveTool: (tool: ActiveTool) => void
  setSnapEnabled: (enabled: boolean) => void
  setGridEnabled: (enabled: boolean) => void
  startDrawingStroke: (point: Point) => void
  addDrawingVertex: (point: Point) => void
  finishDrawing: () => string | null
  cancelDrawing: () => void
  selectDrawingStroke: (index: number) => void
  deleteDrawingStrokeAt: (index: number) => void
  setViewport: (vp: Partial<Viewport>) => void
  setActiveRoomDraft: (draft: Partial<Room> | null) => void
  setSnapGuides: (guides: SnapGuide[]) => void
  setCanvasSize: (size: { width: number; height: number }) => void
  /** World (0,0) centred; standaardzoom ≈ 10×8 minor blokken (zelfde als S / project open). */
  recenterViewportToOrigin: () => void
  /** Zoom t.o.v. 100% = standaardschaal voor canvas (breedte+hoogte); `deltaPercent` bijv. +10 / −10 per stap. */
  zoomViewportByPercentDelta: (deltaPercent: number) => void
  zoomViewportAtCenter: (direction: 'in' | 'out') => void
}

// ─── Default values ────────────────────────────────────────────────────────

const DEFAULT_FILL = 'rgba(53,180,211,0.08)'
const DEFAULT_WALL_HEIGHT = 250

/** Same as `MINOR_GRID` in PixelCanvas — one minor square = 2 m in world space (cm). */
export const BLUEPRINT_MINOR_GRID_CM = 200

/**
 * Default zoom: ongeveer zoveel 2m-blokken (minor grid) zichtbaar op het canvas.
 * Breedte en hoogte worden tegelijk begrensd (meer inzoomen dan alleen op hoogte).
 */
export const TARGET_VISIBLE_MINOR_SQUARES_HORIZONTAL = 10
export const TARGET_VISIBLE_MINOR_SQUARES_VERTICAL = 8

const TARGET_VISIBLE_WORLD_WIDTH_CM =
  TARGET_VISIBLE_MINOR_SQUARES_HORIZONTAL * BLUEPRINT_MINOR_GRID_CM
const TARGET_VISIBLE_WORLD_HEIGHT_CM =
  TARGET_VISIBLE_MINOR_SQUARES_VERTICAL * BLUEPRINT_MINOR_GRID_CM

const VIEW_SCALE_MIN = 0.1
const VIEW_SCALE_MAX = 8

function clampViewScale(n: number): number {
  return Math.min(VIEW_SCALE_MAX, Math.max(VIEW_SCALE_MIN, n))
}

/**
 * Standaardschaal (px per cm wereld): zo ingezoomd dat het zichtbare vlak ongeveer
 * `TARGET_VISIBLE_MINOR_SQUARES_HORIZONTAL` × `TARGET_VISIBLE_MINOR_SQUARES_VERTICAL` minor vierkanten is.
 * Bij een breed canvas beperkt de breedte; bij een hoog canvas de hoogte — `max(scaleW, scaleH)`.
 */
export function getDefaultBlueprintScaleForCanvasSize(widthPx: number, heightPx: number): number {
  if (widthPx <= 0 || heightPx <= 0) {
    return clampViewScale(600 / TARGET_VISIBLE_WORLD_HEIGHT_CM)
  }
  const scaleW = widthPx / TARGET_VISIBLE_WORLD_WIDTH_CM
  const scaleH = heightPx / TARGET_VISIBLE_WORLD_HEIGHT_CM
  return clampViewScale(Math.max(scaleW, scaleH))
}

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  scale: getDefaultBlueprintScaleForCanvasSize(800, 600),
}

const emptyDoc = (): BlueprintDoc => ({
  rooms: {},
  roomOrder: [],
  elements: {},
  canvasTextNotes: {},
  canvasTextNoteOrder: [],
  measureLines: [],
})

// ─── Store ─────────────────────────────────────────────────────────────────

export const useBlueprintStore = create<BlueprintState>()(
  temporal(
    immer((set, get) => ({
      // Document state
      ...emptyDoc(),

      // Ephemeral state
      projectId: null,
      selectedIds: [],
      selectedCanvasTextNoteId: null,
      editingCanvasTextNoteId: null,
      activeTool: 'select',
      snapEnabled: true,
      gridEnabled: false,
      drawingStrokes: [],
      selectedDrawingStrokeIndex: null,
      selectedMeasureLineId: null,
      measureDraft: null,
      viewport: DEFAULT_VIEWPORT,
      activeRoomDraft: null,
      snapGuides: [],
      canvasSize: { width: 800, height: 600 },

      // ── Document actions ──────────────────────────────────────────────

      addRoom: (vertices, meta = {}) => {
        const id = nanoid()
        const bbox = axisAlignedBBoxSize(vertices)
        set(state => {
          state.rooms[id] = {
            id,
            name: meta.name ?? 'Ruimte',
            vertices,
            fill: meta.fill ?? DEFAULT_FILL,
            wallHeight: meta.wallHeight ?? DEFAULT_WALL_HEIGHT,
            label: meta.label,
            shape: meta.shape,
            planWidthCm: meta.planWidthCm ?? bbox.w,
            planDepthCm: meta.planDepthCm ?? bbox.h,
            lockedWalls: meta.lockedWalls ?? [],
            roofType: meta.roofType ?? 'plat',
            roofPeakHeight: meta.roofPeakHeight,
            wallHeights: meta.wallHeights,
            ceiling: meta.ceiling,
          }
          state.roomOrder.push(id)
        })
        return id
      },

      updateRoomVertices: (id, vertices) => {
        set(state => {
          const room = state.rooms[id]
          if (!room) return
          room.vertices = vertices
          const { w, h } = axisAlignedBBoxSize(vertices)
          room.planWidthCm = w
          room.planDepthCm = h
        })
      },

      updateRoomVertex: (id, index, point) => {
        set(state => {
          const room = state.rooms[id]
          if (!room) return
          room.vertices[index] = point
          const { w, h } = axisAlignedBBoxSize(room.vertices)
          room.planWidthCm = w
          room.planDepthCm = h
        })
      },

      updateRoom: (id, updates) => {
        set(state => {
          if (state.rooms[id]) Object.assign(state.rooms[id], updates)
        })
      },

      deleteRoom: (id) => {
        set(state => {
          delete state.rooms[id]
          state.roomOrder = state.roomOrder.filter(rid => rid !== id)
          for (const eid of Object.keys(state.elements)) {
            if (state.elements[eid].roomId === id) delete state.elements[eid]
          }
        })
      },

      addElement: (el) => {
        const id = nanoid()
        set(state => {
          state.elements[id] = { ...el, id }
        })
        return id
      },

      updateElement: (id, updates) => {
        set(state => {
          if (state.elements[id]) Object.assign(state.elements[id], updates)
        })
      },

      deleteElement: (id) => {
        set(state => {
          delete state.elements[id]
        })
      },

      toggleWallLock: (roomId, wallIndex) => {
        set(state => {
          const room = state.rooms[roomId]
          if (!room) return
          const idx = room.lockedWalls.indexOf(wallIndex)
          if (idx >= 0) room.lockedWalls.splice(idx, 1)
          else room.lockedWalls.push(wallIndex)
        })
      },

      setWallLength: (roomId, wallIndex, lengthCm) => {
        set(state => {
          const room = state.rooms[roomId]
          if (!room) return
          if ((room.lockedWalls ?? []).includes(wallIndex)) return
          room.vertices = applyWallLengthRespectingLocks(
            room.vertices.map(v => ({ ...v })),
            wallIndex,
            lengthCm,
            room.lockedWalls ?? [],
          )
          const { w, h } = axisAlignedBBoxSize(room.vertices)
          room.planWidthCm = w
          room.planDepthCm = h
        })
      },

      setRoofType: (roomId, type, peakHeight) => {
        set(state => {
          const room = state.rooms[roomId]
          if (!room) return
          room.roofType = type
          if (peakHeight !== undefined) room.roofPeakHeight = peakHeight
        })
      },

      addMeasureLine: (start, end) => {
        const id = nanoid()
        set(state => {
          const a = snapPointToGrid(start)
          const b = snapPointToGrid(end)
          state.measureLines.push({ id, start: a, end: b })
          state.measureDraft = null
          state.selectedMeasureLineId = null
        })
        return id
      },

      deleteMeasureLine: (lineId) => {
        set(state => {
          state.measureLines = state.measureLines.filter(m => m.id !== lineId)
          if (state.selectedMeasureLineId === lineId) state.selectedMeasureLineId = null
        })
      },

      selectMeasureLine: (lineId) => {
        set(state => {
          state.selectedMeasureLineId = lineId
          state.selectedDrawingStrokeIndex = null
          state.selectedCanvasTextNoteId = null
          state.editingCanvasTextNoteId = null
          state.selectedIds = []
        })
      },

      setMeasureDraft: (draft) => {
        set(state => {
          state.measureDraft = draft
        })
      },

      clearMeasureDraft: () => {
        set(state => {
          state.measureDraft = null
        })
      },

      // ── Ephemeral actions ─────────────────────────────────────────────

      initProject: (projectId) => {
        set(state => {
          if (state.projectId === projectId) return
          Object.assign(state, emptyDoc())
          state.projectId = projectId
          state.selectedIds = []
          state.selectedCanvasTextNoteId = null
          state.editingCanvasTextNoteId = null
          state.selectedDrawingStrokeIndex = null
          state.selectedMeasureLineId = null
          state.measureDraft = null
          state.activeTool = 'select'
          state.drawingStrokes = []
          // Viewport is owned by PixelCanvas (centre on world 0,0). Do not reset to 0,0 here —
          // parent useEffect runs after child ResizeObserver and would wipe a correct centre.
          state.activeRoomDraft = null
          state.snapGuides = []
        })
        useBlueprintStore.temporal.getState().clear()
      },

      select: (ids) => {
        set(state => {
          state.selectedIds = ids
          state.selectedCanvasTextNoteId = null
          state.editingCanvasTextNoteId = null
          state.selectedDrawingStrokeIndex = null
          state.selectedMeasureLineId = null
        })
      },

      clearSelection: () => {
        set(state => {
          state.selectedIds = []
          state.selectedCanvasTextNoteId = null
          state.editingCanvasTextNoteId = null
          state.selectedDrawingStrokeIndex = null
          state.selectedMeasureLineId = null
        })
      },

      selectCanvasTextNote: (id) => {
        set(state => {
          state.selectedCanvasTextNoteId = id
          state.editingCanvasTextNoteId = null
          state.selectedIds = []
          state.selectedDrawingStrokeIndex = null
          state.selectedMeasureLineId = null
        })
      },

      openCanvasTextNoteEditor: (id) => {
        set(state => {
          state.selectedCanvasTextNoteId = id
          state.editingCanvasTextNoteId = id
          state.selectedIds = []
          state.selectedDrawingStrokeIndex = null
          state.selectedMeasureLineId = null
        })
      },

      setEditingCanvasTextNoteId: (id) => {
        set(state => {
          state.editingCanvasTextNoteId = id
        })
      },

      addCanvasTextNote: (point) => {
        const id = nanoid()
        set(state => {
          state.canvasTextNotes[id] = { id, x: point.x, y: point.y, text: '' }
          state.canvasTextNoteOrder.push(id)
          state.selectedIds = []
          state.selectedCanvasTextNoteId = id
          state.editingCanvasTextNoteId = id
          state.selectedDrawingStrokeIndex = null
          state.selectedMeasureLineId = null
        })
        return id
      },

      updateCanvasTextNote: (id, updates) => {
        set(state => {
          const n = state.canvasTextNotes[id]
          if (n) Object.assign(n, updates)
        })
      },

      deleteCanvasTextNote: (id) => {
        set(state => {
          delete state.canvasTextNotes[id]
          state.canvasTextNoteOrder = state.canvasTextNoteOrder.filter(x => x !== id)
          if (state.selectedCanvasTextNoteId === id) state.selectedCanvasTextNoteId = null
          if (state.editingCanvasTextNoteId === id) state.editingCanvasTextNoteId = null
        })
      },

      setActiveTool: (tool) => {
        set(state => {
          state.activeTool = tool
          if (tool !== 'measure') {
            state.measureDraft = null
          }
          // Sluit de HTML-teksteditor bij wisselen naar iets anders dan Schrijven — anders blijft
          // editingCanvasTextNoteId gezet en werkt Delete/Backspace niet (useBlueprintKeyboard).
          if (tool !== 'write') {
            state.editingCanvasTextNoteId = null
          }
        })
      },

      setSnapEnabled: (enabled) => {
        set(state => { state.snapEnabled = enabled })
      },

      setGridEnabled: (enabled) => {
        set(state => { state.gridEnabled = enabled })
      },

      startDrawingStroke: (point) => {
        set(state => {
          const snap = snapPointToGrid(point)
          state.drawingStrokes.push([snap])
          state.selectedDrawingStrokeIndex = null
          state.selectedMeasureLineId = null
        })
      },

      selectDrawingStroke: (index) => {
        set(state => {
          if (index < 0 || index >= state.drawingStrokes.length) return
          state.selectedDrawingStrokeIndex = index
          state.selectedIds = []
          state.selectedCanvasTextNoteId = null
          state.editingCanvasTextNoteId = null
          state.selectedMeasureLineId = null
        })
      },

      deleteDrawingStrokeAt: (index) => {
        set(state => {
          if (index < 0 || index >= state.drawingStrokes.length) return
          state.drawingStrokes.splice(index, 1)
          state.selectedDrawingStrokeIndex = null
        })
      },

      addDrawingVertex: (point) => {
        set(state => {
          const snap = snapPointToGrid(point)
          const strokes = state.drawingStrokes
          const last = strokes[strokes.length - 1]
          if (!last) return
          const prev = last[last.length - 1]
          if (prev && prev.x === snap.x && prev.y === snap.y) return
          last.push(snap)
        })
      },

      finishDrawing: () => {
        const { drawingStrokes, addRoom } = get()
        const flat = drawingStrokes.flat()
        if (flat.length < 3) {
          set(state => {
            state.drawingStrokes = []
            state.selectedDrawingStrokeIndex = null
          })
          return null
        }
        const id = addRoom([...flat])
        set(state => {
          state.drawingStrokes = []
          state.selectedDrawingStrokeIndex = null
          state.activeTool = 'select'
        })
        return id
      },

      cancelDrawing: () => {
        set(state => {
          state.drawingStrokes = []
          state.selectedDrawingStrokeIndex = null
          state.activeTool = 'select'
        })
      },

      setViewport: (vp) => {
        set(state => { Object.assign(state.viewport, vp) })
      },

      setActiveRoomDraft: (draft) => {
        set(state => { state.activeRoomDraft = draft })
      },

      setSnapGuides: (guides) => {
        set(state => { state.snapGuides = guides })
      },

      setCanvasSize: (size) => {
        set(state => { state.canvasSize = size })
      },

      recenterViewportToOrigin: () => {
        set(state => {
          const { width, height } = state.canvasSize
          if (width <= 0 || height <= 0) return
          state.viewport.x = width / 2
          state.viewport.y = height / 2
          state.viewport.scale = getDefaultBlueprintScaleForCanvasSize(width, height)
        })
      },

      /**
       * Zoom in stappen van X% t.o.v. 100% (basis = `getDefaultBlueprintScaleForCanvasSize`).
       * Alleen viewport — hoort niet in undo-geschiedenis (zie temporal `equality`).
       */
      zoomViewportByPercentDelta: (deltaPercent: number) => {
        set(state => {
          const { width, height } = state.canvasSize
          if (width <= 0 || height <= 0) return
          const base = getDefaultBlueprintScaleForCanvasSize(width, height)
          const cx = width / 2
          const cy = height / 2
          const oldScale = state.viewport.scale
          const currentPercent = (oldScale / base) * 100
          const nextPercent = Math.max(10, Math.min(800, currentPercent + deltaPercent))
          const next = clampViewScale(base * (nextPercent / 100))
          const worldX = (cx - state.viewport.x) / oldScale
          const worldY = (cy - state.viewport.y) / oldScale
          state.viewport.scale = next
          state.viewport.x = cx - worldX * next
          state.viewport.y = cy - worldY * next
        })
      },

      zoomViewportAtCenter: (direction: 'in' | 'out') => {
        get().zoomViewportByPercentDelta(direction === 'in' ? 10 : -10)
      },
    })),
    {
      partialize: (state): BlueprintDoc => ({
        rooms: state.rooms,
        roomOrder: state.roomOrder,
        elements: state.elements,
        canvasTextNotes: state.canvasTextNotes,
        canvasTextNoteOrder: state.canvasTextNoteOrder,
        measureLines: state.measureLines,
      }),
      /**
       * Zonder equality: elke `set` (viewport, selectie, pan, …) duwt een undo-stap,
       * terwijl `partialize` alleen het document herstelt — dan moet je meerdere keren
       * undo drukken voordat een kamerwijziging zichtbaar teruggaat.
       */
      equality: (past, current) =>
        past.rooms === current.rooms &&
        past.roomOrder === current.roomOrder &&
        past.elements === current.elements &&
        past.measureLines === current.measureLines,
      limit: 50,
    },
  ),
)

// ─── Selector hooks ────────────────────────────────────────────────────────

export const useRoom = (id: string) =>
  useBlueprintStore(state => state.rooms[id])

export const useRoomIds = () =>
  useBlueprintStore(state => state.roomOrder)

export const useSelectedIds = () =>
  useBlueprintStore(state => state.selectedIds)

export const useActiveTool = () =>
  useBlueprintStore(state => state.activeTool)

export const useViewport = () =>
  useBlueprintStore(state => state.viewport)

export const useSnapGuides = () =>
  useBlueprintStore(state => state.snapGuides)

export const useSnapEnabled = () =>
  useBlueprintStore(state => state.snapEnabled)

export const useGridEnabled = () =>
  useBlueprintStore(state => state.gridEnabled)

export const useCanvasTextNoteOrder = () =>
  useBlueprintStore(state => state.canvasTextNoteOrder)

export const useEditingCanvasTextNoteId = () =>
  useBlueprintStore(state => state.editingCanvasTextNoteId)

export const useSelectedCanvasTextNoteId = () =>
  useBlueprintStore(state => state.selectedCanvasTextNoteId)

export const useSelectedDrawingStrokeIndex = () =>
  useBlueprintStore(state => state.selectedDrawingStrokeIndex)

export const useMeasureLines = () =>
  useBlueprintStore(state => state.measureLines)

export const useMeasureDraft = () =>
  useBlueprintStore(state => state.measureDraft)

export const useSelectedMeasureLineId = () =>
  useBlueprintStore(state => state.selectedMeasureLineId)

// Module-level singleton for use in Konva event handlers (outside React)
export const blueprintStore = useBlueprintStore
