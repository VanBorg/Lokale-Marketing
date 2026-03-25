import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import { nanoid } from 'nanoid'
import {
  applyWallLengthRespectingLocks,
  axisAlignedBBoxSize,
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

export type ActiveTool = 'select' | 'draw' | 'pan' | 'add-deur' | 'add-raam' | 'add-trap' | 'add-kast' | 'add-overig'

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
}

// ─── Full store state ──────────────────────────────────────────────────────

interface BlueprintState extends BlueprintDoc {
  // Ephemeral — not in undo history
  projectId: string | null
  selectedIds: string[]
  activeTool: ActiveTool
  drawingVertices: Point[]
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
  toggleWallLock: (roomId: string, wallIndex: number) => void
  setWallLength: (roomId: string, wallIndex: number, lengthCm: number) => void
  setRoofType: (roomId: string, type: RoofType, peakHeight?: number) => void

  // Actions — ephemeral
  initProject: (projectId: string) => void
  select: (ids: string[]) => void
  clearSelection: () => void
  setActiveTool: (tool: ActiveTool) => void
  addDrawingVertex: (point: Point) => void
  finishDrawing: () => string | null
  cancelDrawing: () => void
  setViewport: (vp: Partial<Viewport>) => void
  setActiveRoomDraft: (draft: Partial<Room> | null) => void
  setSnapGuides: (guides: SnapGuide[]) => void
  setCanvasSize: (size: { width: number; height: number }) => void
  /** World (0,0) centred; scale fits ~12 minor squares vertically (same as S / project open). */
  recenterViewportToOrigin: () => void
}

// ─── Default values ────────────────────────────────────────────────────────

const DEFAULT_FILL = 'rgba(53,180,211,0.08)'
const DEFAULT_WALL_HEIGHT = 250

/** Same as `MINOR_GRID` in BlueprintCanvas — one minor square = 2 m in world space (cm). */
export const BLUEPRINT_MINOR_GRID_CM = 200

/**
 * Vertically: aim for this many minor grid squares visible (10–14 ⇒ 20–28 m).
 * 12 ⇒ 24 m visible height — middle of the range.
 */
export const TARGET_VISIBLE_MINOR_SQUARES_VERTICAL = 12

const TARGET_VISIBLE_WORLD_HEIGHT_CM =
  TARGET_VISIBLE_MINOR_SQUARES_VERTICAL * BLUEPRINT_MINOR_GRID_CM

const VIEW_SCALE_MIN = 0.1
const VIEW_SCALE_MAX = 8

function clampViewScale(n: number): number {
  return Math.min(VIEW_SCALE_MAX, Math.max(VIEW_SCALE_MIN, n))
}

/**
 * Scale so that the canvas shows ~`TARGET_VISIBLE_MINOR_SQUARES_VERTICAL` minor squares
 * top-to-bottom (world Y), i.e. visible height ≈ 20–28 m at 10–14 squares.
 * `visibleWorldHeight ≈ canvasHeightPx / scale`.
 */
export function getDefaultBlueprintScaleForCanvasHeight(heightPx: number): number {
  if (heightPx <= 0) return clampViewScale(600 / TARGET_VISIBLE_WORLD_HEIGHT_CM)
  return clampViewScale(heightPx / TARGET_VISIBLE_WORLD_HEIGHT_CM)
}

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  scale: getDefaultBlueprintScaleForCanvasHeight(600),
}

const emptyDoc = (): BlueprintDoc => ({
  rooms: {},
  roomOrder: [],
  elements: {},
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
      activeTool: 'select',
      drawingVertices: [],
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

      // ── Ephemeral actions ─────────────────────────────────────────────

      initProject: (projectId) => {
        set(state => {
          if (state.projectId === projectId) return
          Object.assign(state, emptyDoc())
          state.projectId = projectId
          state.selectedIds = []
          state.activeTool = 'select'
          state.drawingVertices = []
          // Viewport is owned by BlueprintCanvas (centre on world 0,0). Do not reset to 0,0 here —
          // parent useEffect runs after child ResizeObserver and would wipe a correct centre.
          state.activeRoomDraft = null
          state.snapGuides = []
        })
        useBlueprintStore.temporal.getState().clear()
      },

      select: (ids) => {
        set(state => { state.selectedIds = ids })
      },

      clearSelection: () => {
        set(state => { state.selectedIds = [] })
      },

      setActiveTool: (tool) => {
        set(state => { state.activeTool = tool })
      },

      addDrawingVertex: (point) => {
        set(state => { state.drawingVertices.push(point) })
      },

      finishDrawing: () => {
        const { drawingVertices, addRoom } = get()
        if (drawingVertices.length < 3) {
          set(state => { state.drawingVertices = [] })
          return null
        }
        const id = addRoom([...drawingVertices])
        set(state => {
          state.drawingVertices = []
          state.activeTool = 'select'
        })
        return id
      },

      cancelDrawing: () => {
        set(state => {
          state.drawingVertices = []
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
          state.viewport.scale = getDefaultBlueprintScaleForCanvasHeight(height)
        })
      },
    })),
    {
      partialize: (state): BlueprintDoc => ({
        rooms: state.rooms,
        roomOrder: state.roomOrder,
        elements: state.elements,
      }),
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

// Module-level singleton for use in Konva event handlers (outside React)
export const blueprintStore = useBlueprintStore
