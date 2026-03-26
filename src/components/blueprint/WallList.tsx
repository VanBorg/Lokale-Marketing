import { useCallback, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { blueprintStore, useBlueprintStore } from '../../store/blueprintStore'
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

  /** Per kamer inklapbaar; geselecteerde kamer klapt automatisch open. */
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<string>>(() => new Set())
  const [previewExpanded, setPreviewExpanded] = useState(true)

  const wallListExpandSeq = useBlueprintStore(s => s.wallListExpandSeq)
  const wallListExpandRoomId = useBlueprintStore(s => s.wallListExpandRoomId)

  useEffect(() => {
    if (!selectedRoomId) return
    setExpandedRoomIds(prev => {
      const next = new Set(prev)
      next.add(selectedRoomId)
      return next
    })
  }, [selectedRoomId])

  useEffect(() => {
    if (wallListExpandRoomId == null) return
    setExpandedRoomIds(prev => {
      const next = new Set(prev)
      next.add(wallListExpandRoomId)
      return next
    })
  }, [wallListExpandSeq, wallListExpandRoomId])

  const toggleRoomExpanded = useCallback((roomId: string) => {
    setExpandedRoomIds(prev => {
      const next = new Set(prev)
      if (next.has(roomId)) next.delete(roomId)
      else next.add(roomId)
      return next
    })
  }, [])

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
            <button
              type="button"
              onClick={() => setPreviewExpanded(e => !e)}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-dark-border bg-dark px-2 py-2 text-left transition-all duration-200 hover:bg-dark-border/35 theme-light:border-neutral-300 theme-light:bg-white theme-light:hover:bg-neutral-100"
              aria-expanded={previewExpanded}
            >
              <span className="text-xs font-semibold text-light/55 theme-light:text-neutral-600">
                Voorbeeld (nieuwe kamer)
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-light/40 transition-transform duration-200 theme-light:text-neutral-500 ${
                  previewExpanded ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>
            {previewExpanded && (
              <div className="pt-2">
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
            )}
          </div>
        )}

        {roomOrder.map((roomId, roomIdx) => {
          const room = rooms[roomId]
          if (!room) return null
          const isExpanded = expandedRoomIds.has(roomId)
          const isRoomSelected = selectedRoomId === roomId
          return (
            <div key={roomId} className={WALL_LIST_SECTION}>
              <button
                type="button"
                onClick={() => toggleRoomExpanded(roomId)}
                className={[
                  'flex w-full items-center justify-between gap-2 rounded-md border px-2 py-2 text-left transition-all duration-200',
                  isRoomSelected
                    ? 'border-accent/45 bg-accent/[0.08] ring-1 ring-accent/25 theme-light:border-accent/50 theme-light:bg-accent/[0.06]'
                    : 'border-dark-border bg-dark hover:bg-dark-border/35 theme-light:border-neutral-300 theme-light:bg-white theme-light:hover:bg-neutral-100',
                ].join(' ')}
                aria-expanded={isExpanded}
              >
                <span className="text-xs font-semibold text-light/55 theme-light:text-neutral-600">
                  Kamer {roomIdx + 1}
                  {room.name ? (
                    <span className="font-normal text-light/35 theme-light:text-neutral-500">
                      {' '}
                      · {room.name}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-light/40 transition-transform duration-200 theme-light:text-neutral-500 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {isExpanded && (
                <div className="px-0.5 pt-2 pb-0.5">
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
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
