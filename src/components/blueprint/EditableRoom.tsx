import { memo, useRef, useCallback } from 'react'
import { Group, Line, Circle } from 'react-konva'
import type Konva from 'konva'
import {
  useBlueprintStore,
  useSelectedIds,
  useActiveTool,
  blueprintStore,
} from '../../store/blueprintStore'
import {
  snapPointToGrid,
  findVertexSnap,
  isVertexPinnedByGeometryWallLock,
} from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'
import { snapValue } from '../../editor/canvas/useCanvasControls'
import WallLabels from './WallLabels'

interface EditableRoomProps {
  roomId: string
  stageRef: React.RefObject<Konva.Stage | null>
}

const VERTEX_RADIUS = 5
const VERTEX_FILL = '#35B4D3'
/** Zelfde als Kamer Overview: muur-geometrie-slot. */
const ORANGE_GEOM_PIN = '#f97316'

const EditableRoom = memo(function EditableRoom({ roomId, stageRef }: EditableRoomProps) {
  const room = useBlueprintStore(s => s.rooms[roomId])
  const selectedIds = useSelectedIds()
  const isSelected = selectedIds.includes(roomId)
  const activeTool = useActiveTool()

  const { theme } = useTheme()
  const isLight = theme === 'light'

  const strokeIdle     = isLight ? '#0e7490' : '#35B4D3'
  const fillIdle       = isLight ? 'rgba(14,116,144,0.08)' : 'rgba(53,180,211,0.07)'
  const strokeSelected = isLight ? '#0891b2' : '#5ecde8'
  const fillSelected   = isLight ? 'rgba(14,116,144,0.18)' : 'rgba(53,180,211,0.18)'

  const lineRef = useRef<Konva.Line>(null)
  const groupRef = useRef<Konva.Group>(null)

  const handleSelect = useCallback(() => {
    blueprintStore.getState().select([roomId])
  }, [roomId])

  // Whole-room drag: pause undo history, use imperative updates
  const handleGroupDragStart = useCallback(() => {
    blueprintStore.temporal.getState().pause()
    blueprintStore.getState().select([roomId])
  }, [roomId])

  const handleGroupDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const group = e.target as Konva.Group
      let dx = group.x()
      let dy = group.y()
      group.position({ x: 0, y: 0 })

      const store = blueprintStore.getState()
      const currentRoom = store.rooms[roomId]
      if (!currentRoom) return

      // Snap the moved first vertex to grid; derive dx/dy from that
      if (store.snapEnabled && currentRoom.vertices.length > 0) {
        const v0 = currentRoom.vertices[0]
        const snappedX = snapValue(v0.x + dx, true)
        const snappedY = snapValue(v0.y + dy, true)
        dx = snappedX - v0.x
        dy = snappedY - v0.y
      }

      const newVertices = currentRoom.vertices.map(v => ({ x: v.x + dx, y: v.y + dy }))
      store.updateRoomVertices(roomId, newVertices)
      blueprintStore.temporal.getState().resume()
    },
    [roomId],
  )

  // Vertex drag
  const handleVertexDragMove = useCallback(
    (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
      const circle = e.target as Konva.Circle
      const store = blueprintStore.getState()
      const room = store.rooms[roomId]
      if (!room) return

      const raw = { x: circle.x(), y: circle.y() }
      let pt = store.snapEnabled ? snapPointToGrid(raw) : raw

      // Vertex-to-vertex snap against other rooms
      const otherRooms = Object.values(store.rooms).filter(r => r.id !== roomId)
      const snapped = findVertexSnap(pt, otherRooms)
      if (snapped) {
        pt = snapped
        circle.position(pt)
      }

      // Update the line imperatively
      const line = lineRef.current
      if (!line) return
      const pts = [...room.vertices]
      pts[index] = pt
      const flat = pts.flatMap(v => [v.x, v.y])
      line.points(flat)
      line.getLayer()?.batchDraw()
    },
    [roomId],
  )

  const handleVertexDragEnd = useCallback(
    (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
      const circle = e.target as Konva.Circle
      const store = blueprintStore.getState()
      const room = store.rooms[roomId]
      if (!room) return

      const raw = { x: circle.x(), y: circle.y() }
      let pt = store.snapEnabled ? snapPointToGrid(raw) : raw

      const otherRooms = Object.values(store.rooms).filter(r => r.id !== roomId)
      const snapped = findVertexSnap(pt, otherRooms)
      if (snapped) pt = snapped

      store.updateRoomVertex(roomId, index, pt)
      blueprintStore.temporal.getState().resume()
    },
    [roomId],
  )

  const handleVertexDragStart = useCallback(() => {
    blueprintStore.temporal.getState().pause()
  }, [])

  if (!room) return null

  const flatPoints = room.vertices.flatMap(v => [v.x, v.y])
  const n = room.vertices.length
  const geometryLockedWalls = room.lockedWalls ?? []
  /** Only allow drag when select tool is active and no geometry locks are set. */
  const allowRoomDrag = isSelected && geometryLockedWalls.length === 0 && activeTool === 'select'

  return (
    <Group
      ref={groupRef}
      draggable={allowRoomDrag}
      onMouseDown={handleSelect}
      onTap={handleSelect}
      onDragStart={handleGroupDragStart}
      onDragEnd={handleGroupDragEnd}
    >
      <Line
        ref={lineRef}
        points={flatPoints}
        closed
        fill={isSelected ? fillSelected : fillIdle}
        stroke={isSelected ? strokeSelected : strokeIdle}
        strokeWidth={isSelected ? 2.5 : 1.5}
        shadowColor={isSelected ? '#35B4D3' : undefined}
        shadowBlur={isSelected ? 6 : 0}
        shadowOpacity={0.3}
      />

      {/* Wall length labels — always shown for selected room */}
      <WallLabels roomId={roomId} isSelected={isSelected} />

      {/* Vertex handles — only when selected */}
      {isSelected &&
        room.vertices.map((v, i) => {
          const geomPinned = isVertexPinnedByGeometryWallLock(i, n, geometryLockedWalls)
          return (
            <Circle
              key={i}
              x={v.x}
              y={v.y}
              radius={VERTEX_RADIUS}
              fill={geomPinned ? '#1a1a22' : VERTEX_FILL}
              stroke={geomPinned ? ORANGE_GEOM_PIN : '#fff'}
              strokeWidth={1.5}
              draggable={!geomPinned}
              onDragStart={handleVertexDragStart}
              onDragMove={e => handleVertexDragMove(i, e)}
              onDragEnd={e => handleVertexDragEnd(i, e)}
            />
          )
        })}
    </Group>
  )
})

export default EditableRoom
