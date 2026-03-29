import { memo, useRef, useCallback } from 'react'
import { Group, Line } from 'react-konva'
import Konva from 'konva'
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
import { useRoomDetailsStore } from '../../store/roomDetailsStore'
import { getRuimteFunctiePlanStyle } from '../../utils/ruimteFunctiePlanStyle'
import WallLabels from './WallLabels'
import RoomPlanLabel from './RoomPlanLabel'

interface EditableRoomProps {
  roomId: string
  stageRef: React.RefObject<Konva.Stage | null>
}

function findRoomGroupOnStage(stage: Konva.Stage, roomId: string): Konva.Group | null {
  const found = stage.findOne(
    (n: Konva.Node) => n.id() === roomId && n.getClassName() === 'Group',
  )
  return found ? (found as Konva.Group) : null
}

const EditableRoom = memo(function EditableRoom({ roomId, stageRef }: EditableRoomProps) {
  const room = useBlueprintStore(s => s.rooms[roomId])
  const selectedIds = useSelectedIds()
  const isSelected = selectedIds.includes(roomId)
  const activeTool = useActiveTool()

  const { theme } = useTheme()
  const isLight = theme === 'light'

  const ruimteFunctie = useRoomDetailsStore(s => s.details[roomId]?.ruimteFunctie ?? '')
  const planStyle = getRuimteFunctiePlanStyle(ruimteFunctie, isLight)

  const strokeIdle = planStyle.strokeIdle
  const fillIdle = planStyle.fillIdle
  const strokeSelected = planStyle.strokeSelected
  const fillSelected = planStyle.fillSelected

  const groupRef = useRef<Konva.Group>(null)

  const applyRoomSelection = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const evt = e.evt as MouseEvent
      const store = blueprintStore.getState()
      if (evt.ctrlKey || evt.metaKey) {
        store.toggleInSelection(roomId)
        return
      }
      if (evt.shiftKey) {
        store.addToSelection([roomId])
        return
      }
      if (store.selectedIds.includes(roomId)) {
        return
      }
      store.select([roomId])
    },
    [roomId],
  )

  /** Schrijven: alleen via onTap plaatsen — niet in onMouseDown (anders dubbel met Tap). */
  const handleGroupPointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'write') {
        e.cancelBubble = true
        return
      }
      applyRoomSelection(e)
    },
    [activeTool, applyRoomSelection],
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
    },
    [activeTool, stageRef],
  )

  /**
   * Whole-room drag: Konva verplaatst de groep visueel; pas bij dragEnd schrijven we vertices.
   * Geen temporal.pause() — zundo slaat bij isTracking:false geen stappen op, waardoor de
   * enige updateRoomVertices na de sleep ontbrak in de undo-geschiedenis.
   */
  const handleGroupDragStart = useCallback(() => {
    const store = blueprintStore.getState()
    if (store.selectedIds.includes(roomId)) return
    store.select([roomId])
  }, [roomId])

  const handleGroupDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const store = blueprintStore.getState()
      const fromSelection = store.selectedIds.filter(id => store.rooms[id])
      const movingRoomIds =
        fromSelection.length > 0 ? fromSelection : [roomId].filter(id => store.rooms[id])
      if (movingRoomIds.length <= 1) return
      const leader = e.target as Konva.Group
      const x = leader.x()
      const y = leader.y()
      const stage = stageRef.current
      if (!stage) return
      for (const id of movingRoomIds) {
        if (id === roomId) continue
        const node = findRoomGroupOnStage(stage, id)
        if (node) node.position({ x, y })
      }
    },
    [roomId, stageRef],
  )

  const handleGroupDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const leader = e.target as Konva.Group
      let dx = leader.x()
      let dy = leader.y()

      const store = blueprintStore.getState()
      const fromSelection = store.selectedIds.filter(id => store.rooms[id])
      const movingRoomIds =
        fromSelection.length > 0 ? fromSelection : [roomId].filter(id => store.rooms[id])

      const resetAllMovingGroups = () => {
        leader.position({ x: 0, y: 0 })
        const st = stageRef.current
        if (!st) return
        for (const id of movingRoomIds) {
          if (id === roomId) continue
          const g = findRoomGroupOnStage(st, id)
          if (g) g.position({ x: 0, y: 0 })
        }
      }

      // Konva kan dragEnd afvuren na klik op een al geselecteerde kamer (nul verplaatsing).
      // applyRoomTranslationDelta overslaan — wel alle groep-offsets terug naar 0.
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
        resetAllMovingGroups()
        return
      }

      const currentRoom = store.rooms[roomId]
      if (!currentRoom) {
        resetAllMovingGroups()
        return
      }

      const movingSet = new Set(movingRoomIds)
      const otherRooms = Object.values(store.rooms).filter(r => !movingSet.has(r.id))

      if (currentRoom.vertices.length > 0) {
        // Priority 1: corner-to-corner snap on RAW drag offset (before grid snap).
        const rawVerts = currentRoom.vertices.map(v => ({ x: v.x + dx, y: v.y + dy }))
        const cornerSnap = findRoomCornerSnap(rawVerts, otherRooms, 40)
        if (cornerSnap) {
          dx += cornerSnap.offset.x
          dy += cornerSnap.offset.y
        } else if (store.snapEnabled) {
          const v0 = currentRoom.vertices[0]
          const snapped = snapPointToGrid({ x: v0.x + dx, y: v0.y + dy })
          dx = snapped.x - v0.x
          dy = snapped.y - v0.y

          const tentativeVerts = currentRoom.vertices.map(v => ({ x: v.x + dx, y: v.y + dy }))
          const edgeSnap = findEdgeSnap(tentativeVerts, otherRooms, 100)
          if (edgeSnap) {
            dx += edgeSnap.offset.x
            dy += edgeSnap.offset.y
          }
        }
      }

      store.applyRoomTranslationDelta(movingRoomIds, dx, dy)
      resetAllMovingGroups()
    },
    [roomId, stageRef],
  )

  if (!room) return null

  const flatPoints = room.vertices.flatMap(v => [v.x, v.y])
  /** Drag alleen met Select of Hand (na selectie), zodat je met Hand kunt pannen/scrollen maar geselecteerde kamers kunt verschuiven. */
  const allowRoomDrag =
    isSelected && (activeTool === 'select' || activeTool === 'pan')

  return (
    <Group
      ref={groupRef}
      id={roomId}
      draggable={allowRoomDrag}
      onMouseDown={handleGroupPointerDown}
      onTap={handleGroupTap}
      onDragStart={handleGroupDragStart}
      onDragMove={handleGroupDragMove}
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

      <RoomPlanLabel vertices={room.vertices} roomName={room.name} icon={planStyle.icon} />

      {/* Muurlengtes op de buitenzijde (maatlijn + label); hoeken alleen bij selectie */}
      <WallLabels roomId={roomId} isSelected={isSelected} />
    </Group>
  )
})

export default EditableRoom
