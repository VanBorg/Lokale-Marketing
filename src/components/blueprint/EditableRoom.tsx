import { memo, useRef, useCallback } from 'react'
import { Group, Line } from 'react-konva'
import type Konva from 'konva'
import {
  useBlueprintStore,
  useSelectedIds,
  useActiveTool,
  blueprintStore,
} from '../../store/blueprintStore'
import {
  snapPointToGrid,
  findEdgeSnap,
  findRoomCornerSnap,
} from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'
import WallLabels from './WallLabels'

interface EditableRoomProps {
  roomId: string
  stageRef: React.RefObject<Konva.Stage | null>
}

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

  const groupRef = useRef<Konva.Group>(null)

  const handleSelect = useCallback(() => {
    blueprintStore.getState().select([roomId])
  }, [roomId])

  /** Schrijven: alleen via onTap plaatsen — niet in onMouseDown (anders dubbel met Tap). */
  const handleGroupPointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'write') {
        e.cancelBubble = true
        return
      }
      handleSelect()
    },
    [activeTool, handleSelect],
  )

  const handleGroupTap = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool === 'write') {
        e.cancelBubble = true
        const stage = stageRef.current
        if (!stage) return
        const pointer = stage.getPointerPosition()
        if (!pointer) return
        const scale = stage.scaleX()
        blueprintStore.getState().addCanvasTextNote({
          x: (pointer.x - stage.x()) / scale,
          y: (pointer.y - stage.y()) / scale,
        })
        return
      }
      handleSelect()
    },
    [activeTool, stageRef, handleSelect],
  )

  /**
   * Whole-room drag: Konva verplaatst de groep visueel; pas bij dragEnd schrijven we vertices.
   * Geen temporal.pause() — zundo slaat bij isTracking:false geen stappen op, waardoor de
   * enige updateRoomVertices na de sleep ontbrak in de undo-geschiedenis.
   */
  const handleGroupDragStart = useCallback(() => {
    blueprintStore.getState().select([roomId])
  }, [roomId])

  const handleGroupDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const group = e.target as Konva.Group
      let dx = group.x()
      let dy = group.y()
      group.position({ x: 0, y: 0 })

      // Konva kan dragEnd afvuren na klik op een al geselecteerde kamer (nul verplaatsing).
      // updateRoomVertices zou dan toch Immer muteren → valse undo-stap; overslaan.
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
        return
      }

      const store = blueprintStore.getState()
      const currentRoom = store.rooms[roomId]
      if (!currentRoom) return

      if (currentRoom.vertices.length > 0) {
        const otherRooms = Object.values(store.rooms).filter(r => r.id !== roomId)

        // Priority 1: corner-to-corner snap on RAW drag offset (before grid snap).
        // Grid snap moves v0 to the nearest 20-cm grid point which can push corners
        // *further* from the target, so corner snap must run first on the unsnapped position.
        // 40 cm tolerance: generous enough to catch near-misses yet precise on release.
        const rawVerts = currentRoom.vertices.map(v => ({ x: v.x + dx, y: v.y + dy }))
        const cornerSnap = findRoomCornerSnap(rawVerts, otherRooms, 40)
        if (cornerSnap) {
          dx += cornerSnap.offset.x
          dy += cornerSnap.offset.y
        } else if (store.snapEnabled) {
          // Priority 2: grid snap (coarse 20 cm alignment)
          const v0 = currentRoom.vertices[0]
          const snapped = snapPointToGrid({ x: v0.x + dx, y: v0.y + dy })
          dx = snapped.x - v0.x
          dy = snapped.y - v0.y

          // Priority 3: wall-to-wall edge snap (flush parallel walls, 100 cm tolerance)
          const tentativeVerts = currentRoom.vertices.map(v => ({ x: v.x + dx, y: v.y + dy }))
          const edgeSnap = findEdgeSnap(tentativeVerts, otherRooms, 100)
          if (edgeSnap) {
            dx += edgeSnap.offset.x
            dy += edgeSnap.offset.y
          }
        }
      }

      const newVertices = currentRoom.vertices.map(v => ({ x: v.x + dx, y: v.y + dy }))
      store.updateRoomVertices(roomId, newVertices)
    },
    [roomId],
  )

  if (!room) return null

  const flatPoints = room.vertices.flatMap(v => [v.x, v.y])
  /** Only allow drag when select tool is active. */
  const allowRoomDrag = isSelected && activeTool === 'select'

  return (
    <Group
      ref={groupRef}
      draggable={allowRoomDrag}
      onMouseDown={handleGroupPointerDown}
      onTap={handleGroupTap}
      onDragStart={handleGroupDragStart}
      onDragEnd={handleGroupDragEnd}
    >
      <Line
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
    </Group>
  )
})

export default EditableRoom
