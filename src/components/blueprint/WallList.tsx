import { useCallback } from 'react'
import { blueprintStore } from '../../store/blueprintStore'
import type { Room } from '../../store/blueprintStore'
import { wallLength } from '../../utils/blueprintGeometry'
import WallMetricCell from './WallMetricCell'

const WALL_GRID =
  'grid w-full grid-cols-4 gap-0.5 rounded-md border border-dark-border bg-dark overflow-hidden'
const WALL_LIST_SECTION = 'px-2 pt-2.5 pb-2'

interface WallListProps {
  /** Preview draft vertices (no placed room selected). */
  previewVertices: { x: number; y: number }[]
  /** Single lock for preview draft walls. */
  previewLockedWalls: number[]
  onTogglePreviewLock: (i: number) => void
  onPreviewWallLengthChange: (wallIndex: number, valueCm: number) => void

  rooms: Record<string, Room>
  roomOrder: string[]
  selectedRoomId: string | null
  selectedWallIndex: number | null
  canvasHoveredWallIndex: number | null
  displayedRoomKey: string

  onSetHoveredWall: (state: { roomKey: string; wallIndex: number } | null) => void
  onSetSelectedWallIndex: (i: number) => void
  onRoomWallLengthChange: (roomId: string, wallIndex: number, valueCm: number) => void
}

export default function WallList({
  previewVertices,
  previewLockedWalls,
  onTogglePreviewLock,
  onPreviewWallLengthChange,
  rooms,
  roomOrder,
  selectedRoomId,
  selectedWallIndex,
  canvasHoveredWallIndex,
  displayedRoomKey,
  onSetHoveredWall,
  onSetSelectedWallIndex,
  onRoomWallLengthChange,
}: WallListProps) {
  const previewRoomKey = 'preview'

  const handleRoomWallLengthChange = useCallback(
    (roomId: string, wallIndex: number, value: number) => {
      const r = blueprintStore.getState().rooms[roomId]
      if (!r) return
      if (r.lockedWalls?.includes(wallIndex)) return
      onRoomWallLengthChange(roomId, wallIndex, Math.max(10, value))
    },
    [onRoomWallLengthChange],
  )

  const showPreview = previewVertices.length >= 3 && !selectedRoomId
  const showRooms = roomOrder.length > 0

  if (!showPreview && !showRooms) return null

  return (
    <div className="shrink-0 border-t border-dark-border/50">
      <div className="divide-y divide-dark-border/40">
        {showPreview && (
          <div className={WALL_LIST_SECTION}>
            <div className="pb-1">
              <div className={WALL_GRID} onMouseLeave={() => onSetHoveredWall(null)}>
                {previewVertices.map((_, i) => {
                  const a = previewVertices[i]
                  const b = previewVertices[(i + 1) % previewVertices.length]
                  const lengthCm = Math.round(wallLength(a, b))
                  const locked = previewLockedWalls.includes(i)
                  const isCanvasHovered =
                    canvasHoveredWallIndex === i && displayedRoomKey === previewRoomKey
                  return (
                    <WallMetricCell
                      key={`preview-w-${i}`}
                      wallIndex={i}
                      lengthCm={lengthCm}
                      isActive={selectedWallIndex === i}
                      isCanvasHovered={isCanvasHovered}
                      locked={locked}
                      onToggleLock={() => onTogglePreviewLock(i)}
                      onLengthChange={v => onPreviewWallLengthChange(i, v)}
                      onHoverStart={() => onSetHoveredWall({ roomKey: previewRoomKey, wallIndex: i })}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {roomOrder.map((roomId, roomIdx) => {
          const room = rooms[roomId]
          if (!room) return null
          return (
            <div key={roomId} className={WALL_LIST_SECTION}>
              <div className="px-1 pb-1">
                <span className="text-xs font-semibold text-light/55">
                  Kamer {roomIdx + 1}
                  {room.name ? (
                    <span className="font-normal text-light/35"> · {room.name}</span>
                  ) : null}
                </span>
              </div>
              <div className="px-0.5 pb-0.5">
                <div className={WALL_GRID} onMouseLeave={() => onSetHoveredWall(null)}>
                  {room.vertices.map((_, i) => {
                    const a = room.vertices[i]
                    const b = room.vertices[(i + 1) % room.vertices.length]
                    const lengthCm = Math.round(wallLength(a, b))
                    const isActive = selectedRoomId === roomId && selectedWallIndex === i
                    const isCanvasHovered =
                      canvasHoveredWallIndex === i && displayedRoomKey === roomId
                    const locked = room.lockedWalls?.includes(i) ?? false
                    return (
                      <WallMetricCell
                        key={`${roomId}-w-${i}`}
                        wallIndex={i}
                        lengthCm={lengthCm}
                        isActive={isActive}
                        isCanvasHovered={isCanvasHovered}
                        locked={locked}
                        onToggleLock={() => {
                          blueprintStore.getState().toggleWallLock(roomId, i)
                          if (selectedRoomId !== roomId) {
                            blueprintStore.getState().select([roomId])
                            onSetSelectedWallIndex(i)
                          }
                        }}
                        onLengthChange={v => handleRoomWallLengthChange(roomId, i, v)}
                        onHoverStart={() => onSetHoveredWall({ roomKey: roomId, wallIndex: i })}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
