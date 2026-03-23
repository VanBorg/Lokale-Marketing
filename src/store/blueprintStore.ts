import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import { nanoid } from 'nanoid'
import type { Point, ShapeType } from '../utils/blueprintGeometry'

export type { Point }

// ─── Domain types ──────────────────────────────────────────────────────────

export interface Room {
  id: string
  name: string
  vertices: Point[]
  fill: string
  wallHeight: number
  label?: string
  shape?: ShapeType
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
}

// ─── Default values ────────────────────────────────────────────────────────

const DEFAULT_FILL = 'rgba(53,180,211,0.08)'
const DEFAULT_WALL_HEIGHT = 250
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 }

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
        set(state => {
          state.rooms[id] = {
            id,
            name: meta.name ?? 'Ruimte',
            vertices,
            fill: meta.fill ?? DEFAULT_FILL,
            wallHeight: meta.wallHeight ?? DEFAULT_WALL_HEIGHT,
            label: meta.label,
            shape: meta.shape,
          }
          state.roomOrder.push(id)
        })
        return id
      },

      updateRoomVertices: (id, vertices) => {
        set(state => {
          if (state.rooms[id]) state.rooms[id].vertices = vertices
        })
      },

      updateRoomVertex: (id, index, point) => {
        set(state => {
          if (state.rooms[id]) state.rooms[id].vertices[index] = point
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
          // Remove elements belonging to this room
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

      // ── Ephemeral actions ─────────────────────────────────────────────

      initProject: (projectId) => {
        set(state => {
          if (state.projectId === projectId) return
          Object.assign(state, emptyDoc())
          state.projectId = projectId
          state.selectedIds = []
          state.activeTool = 'select'
          state.drawingVertices = []
          state.viewport = DEFAULT_VIEWPORT
          state.activeRoomDraft = null
          state.snapGuides = []
        })
        // Also clear undo history when switching projects
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
    })),
    {
      // Only persist document state in undo history
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
