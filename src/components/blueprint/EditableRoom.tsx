import { memo, useRef, useCallback } from 'react'
import { Group, Line, Circle } from 'react-konva'
import type Konva from 'konva'
import { useBlueprintStore, useSelectedIds, blueprintStore } from '../../store/blueprintStore'
import {
  snapPointToGrid,
  findVertexSnap,
  isVertexPinnedByGeometryWallLock,
} from '../../utils/blueprintGeometry'
import WallLabels from './WallLabels'

interface EditableRoomProps {
  roomId: string
  stageRef: React.RefObject<Konva.Stage | null>
}

const VERTEX_RADIUS = 5
const VERTEX_FILL = '#35B4D3'
/** Zelfde als Kamer Overview: muur-geometrie-slot. */
const ORANGE_GEOM_PIN = '#f97316'
const STROKE_SELECTED = '#35B4D3'
const STROKE_IDLE = 'rgba(255,255,255,0.3)'
const FILL_SELECTED = 'rgba(53,180,211,0.08)'
const FILL_IDLE = 'rgba(255,255,255,0.04)'

const EditableRoom = memo(function EditableRoom({ roomId, stageRef }: EditableRoomProps) {
  const room = useBlueprintStore(s => s.rooms[roomId])
  const selectedIds = useSelectedIds()
  const isSelected = selectedIds.includes(roomId)

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

  const handleGroupDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const group = e.target as Konva.Group
    const dx = group.x()
    const dy = group.y()
    group.position({ x: 0, y: 0 })

    const store = blueprintStore.getState()
    const currentRoom = store.rooms[roomId]
    if (!currentRoom) return

    const newVertices = currentRoom.vertices.map(v => ({ x: v.x + dx, y: v.y + dy }))
    store.updateRoomVertices(roomId, newVertices)
    blueprintStore.temporal.getState().resume()
  }, [roomId])

  // Vertex drag
  const handleVertexDragMove = useCallback(
    (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
      const circle = e.target as Konva.Circle
      const store = blueprintStore.getState()
      const room = store.rooms[roomId]
      if (!room) return

      let pt = snapPointToGrid({ x: circle.x(), y: circle.y() })

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
      let pt = snapPointToGrid({ x: circle.x(), y: circle.y() })

      const store = blueprintStore.getState()
      const room = store.rooms[roomId]
      if (!room) return

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
  /** Hele kamer slepen verplaatst alle wanden — conflicteert met muur-locatie-slot. */
  const allowRoomDrag = isSelected && geometryLockedWalls.length === 0

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
        fill={isSelected ? FILL_SELECTED : FILL_IDLE}
        stroke={isSelected ? STROKE_SELECTED : STROKE_IDLE}
        strokeWidth={isSelected ? 2 : 1.5}
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
