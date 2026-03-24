import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import {
  blueprintStore,
  useBlueprintStore,
  useSelectedIds,
} from '../../store/blueprintStore'
import { applyWallLength, polygonArea, wallLength } from '../../utils/blueprintGeometry'
import type { Point } from '../../utils/blueprintGeometry'
import { useBlueprintKeyboard } from '../../hooks/useBlueprintKeyboard'
import BlueprintTopBar from './BlueprintTopBar'
import BlueprintCanvas from './BlueprintCanvas'
import BuilderPanel from './BuilderPanel'
import RoomPreviewCanvas from './RoomPreviewCanvas'
import type { Project } from '../../lib/database.types'

interface BlueprintPageProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onTabChange: (tab: string) => void
}

const WALL_GRID =
  'grid w-full grid-cols-3 gap-px rounded-md border border-dark-border bg-dark-border/80 overflow-hidden'

function WallMetricCell({
  wallIndex,
  lenRounded,
  isActive,
  onSelect,
  onLengthChange,
  lockSlot,
  onHoverStart,
  locked = false,
}: {
  wallIndex: number
  lenRounded: number
  isActive: boolean
  onSelect: () => void
  onLengthChange: (value: number) => void
  lockSlot?: ReactNode
  onHoverStart?: () => void
  /** When true, length cannot be edited (vergrendelde wand). */
  locked?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(null)
    }
  }, [lenRounded])

  const commitDraft = () => {
    if (locked) return
    const raw = (draft ?? '').trim()
    if (raw === '') {
      setDraft(null)
      return
    }
    const n = parseFloat(raw.replace(',', '.'))
    if (Number.isNaN(n) || n < 10) {
      setDraft(null)
      return
    }
    onLengthChange(Math.round(n))
    setDraft(null)
  }

  const displayValue = draft !== null ? draft : String(lenRounded)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Wand ${wallIndex + 1}, lengte in centimeters${locked ? ', vergrendeld' : ''}`}
      onClick={onSelect}
      onMouseEnter={onHoverStart}
      onKeyDown={e => {
        if (e.target === inputRef.current) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={[
        'bg-dark px-1.5 py-1.5 min-h-[2rem] flex items-center justify-center gap-1.5 min-w-0 transition-all duration-200 cursor-pointer border border-transparent',
        locked ? 'opacity-90' : '',
        isActive
          ? 'ring-1 ring-inset ring-light/20 bg-light/[0.05]'
          : 'hover:bg-light/[0.06] hover:border-light/15',
      ].join(' ')}
    >
      {lockSlot}
      <div className="flex items-center gap-0.5 shrink-0">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          readOnly={locked}
          title={locked ? undefined : 'Typ een lengte en druk Enter om toe te passen'}
          className={[
            'ui-input text-[10px] py-0 h-6 w-12 text-center tabular-nums px-0.5 min-w-0',
            locked ? 'cursor-not-allowed opacity-70' : '',
          ].join(' ')}
          value={displayValue}
          onClick={e => e.stopPropagation()}
          onFocus={() => {
            if (!locked) setDraft(String(lenRounded))
          }}
          onChange={e => {
            if (locked) return
            setDraft(e.target.value)
          }}
          onBlur={() => {
            setDraft(null)
          }}
          onKeyDown={e => {
            if (locked) return
            e.stopPropagation()
            if (e.key === 'Enter') {
              e.preventDefault()
              commitDraft()
              inputRef.current?.blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setDraft(null)
              inputRef.current?.blur()
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              const base = draft !== null ? parseFloat(draft) : lenRounded
              const cur = Number.isNaN(base) ? lenRounded : base
              setDraft(String(Math.max(10, Math.round(cur + 5))))
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              const base = draft !== null ? parseFloat(draft) : lenRounded
              const cur = Number.isNaN(base) ? lenRounded : base
              setDraft(String(Math.max(10, Math.round(cur - 5))))
            }
          }}
        />
        <span className="text-[9px] text-light/45 shrink-0">cm</span>
      </div>
    </div>
  )
}

export default function BlueprintPage({ project, onUpdateProject, onTabChange }: BlueprintPageProps) {
  useEffect(() => {
    blueprintStore.getState().initProject(project.id)
  }, [project.id])

  useBlueprintKeyboard()

  const [previewVertices, setPreviewVertices] = useState<Point[]>([])
  const [previewLockedWalls, setPreviewLockedWalls] = useState<number[]>([])
  const [previewWidth, setPreviewWidth]       = useState(400)
  const [previewDepth, setPreviewDepth]       = useState(300)

  const selectedIds    = useSelectedIds()
  const selectedRoomId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedRoom   = useBlueprintStore(s => selectedRoomId ? s.rooms[selectedRoomId] : null)
  const roomOrder      = useBlueprintStore(s => s.roomOrder)
  const rooms          = useBlueprintStore(s => s.rooms)

  const [selectedWallIndex, setSelectedWallIndex] = useState<number | null>(null)
  const [hoveredWall, setHoveredWall] = useState<{ roomKey: string; wallIndex: number } | null>(null)

  const previewRoomKey = 'preview'

  useEffect(() => {
    setSelectedWallIndex(null)
    setHoveredWall(null)
  }, [selectedRoomId])

  const handleDelete = () => {
    if (!selectedRoomId) return
    blueprintStore.getState().deleteRoom(selectedRoomId)
    blueprintStore.getState().clearSelection()
  }

  const rotateRoom90 = () => {
    if (!selectedRoom) return
    const rotated = selectedRoom.vertices.map(v => ({ x: -v.y, y: v.x }))
    blueprintStore.getState().updateRoomVertices(selectedRoom.id, rotated)
  }

  const handleWallLengthChange = useCallback((roomId: string, wallIndex: number, value: number) => {
    const r = blueprintStore.getState().rooms[roomId]
    if (r?.lockedWalls?.includes(wallIndex)) return
    const clamped = Math.max(10, value)
    blueprintStore.getState().setWallLength(roomId, wallIndex, clamped)
  }, [])

  const togglePreviewWallLock = useCallback((wallIndex: number) => {
    setPreviewLockedWalls(prev => {
      if (prev.includes(wallIndex)) return prev.filter(i => i !== wallIndex)
      return [...prev, wallIndex].sort((a, b) => a - b)
    })
  }, [])

  const handlePreviewWallLengthChange = useCallback((wallIndex: number, value: number) => {
    if (previewLockedWalls.includes(wallIndex)) return
    const clamped = Math.max(10, value)
    setPreviewVertices(prev => applyWallLength(prev, wallIndex, clamped))
  }, [previewLockedWalls])

  const selectRoomWall = useCallback((roomId: string, wallIndex: number) => {
    blueprintStore.getState().select([roomId])
    setSelectedWallIndex(wallIndex)
  }, [])

  const showMuren =
    (previewVertices.length >= 3 && !selectedRoom) || roomOrder.length > 0

  const displayedRoomKey = selectedRoomId ?? previewRoomKey
  const listHoverWallIndex =
    hoveredWall && hoveredWall.roomKey === displayedRoomKey ? hoveredWall.wallIndex : null

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <BlueprintTopBar
        project={project}
        onUpdateProject={onUpdateProject}
        onTabChange={onTabChange}
      />

      <div className="flex flex-1 min-h-0">

        {/* Column 1 — Canvas */}
        <div className="flex-[9] min-w-0 relative overflow-hidden flex flex-col">
          <BlueprintCanvas />

          {/* Floating selection bar — appears when exactly one room is selected */}
          {selectedRoom && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-dark-card border border-dark-border rounded-lg px-3 py-2 shadow-lg pointer-events-auto">
              <span className="text-xs font-semibold text-light">{selectedRoom.name}</span>
              <span className="text-xs text-light/40">
                {(polygonArea(selectedRoom.vertices) / 10000).toFixed(1)} m²
              </span>
              <div className="w-px h-4 bg-dark-border mx-0.5" />
              <button
                onClick={() => blueprintStore.getState().clearSelection()}
                className="text-xs text-light/50 hover:text-light transition-colors"
                title="Deselecteer"
              >
                ✕
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                title="Verwijder kamer"
              >
                Verwijder
              </button>
            </div>
          )}
        </div>

        {/* Column 2 — Kamer Overview preview panel (340px) */}
        <div className="w-[340px] shrink-0 min-h-0 border-l border-dark-border bg-dark flex flex-col overflow-y-auto">

          {/* 1. Header */}
          <div className="px-3 py-2 border-b border-dark-border shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
              Kamer Overview
            </span>
          </div>

          {/* 2. RoomPreviewCanvas — centered, 12px padding */}
          <div className="flex items-center justify-center p-3 border-b border-dark-border shrink-0">
            <RoomPreviewCanvas
              vertices={selectedRoom ? selectedRoom.vertices : previewVertices}
              onChange={selectedRoom
                ? (verts) => blueprintStore.getState().updateRoomVertices(selectedRoom.id, verts)
                : setPreviewVertices
              }
              onDimensionChange={selectedRoom
                ? undefined
                : (w, d) => { setPreviewWidth(w); setPreviewDepth(d) }
              }
              width={312}
              height={280}
              room={selectedRoom}
              onToggleWallLock={selectedRoom
                ? (wallIndex) => blueprintStore.getState().toggleWallLock(selectedRoom.id, wallIndex)
                : undefined
              }
              draftLockedWalls={selectedRoom ? undefined : previewLockedWalls}
              onDraftToggleWallLock={selectedRoom ? undefined : togglePreviewWallLock}
              selectedWallIndex={
                selectedRoom
                  ? selectedWallIndex
                  : (previewVertices.length >= 3 ? selectedWallIndex : undefined)
              }
              onSelectWall={
                selectedRoom
                  ? setSelectedWallIndex
                  : (previewVertices.length >= 3 ? setSelectedWallIndex : undefined)
              }
              hideWallDetailPanel={!!selectedRoom || (previewVertices.length >= 3 && !selectedRoom)}
              listHoverWallIndex={listHoverWallIndex}
            />
          </div>

          {/* 3. Muren — concept (builder preview) + alle geplaatste kamers */}
          {showMuren ? (
            <div className="shrink-0 border-t border-dark-border/50">
              <div className="px-3 py-1.5 border-b border-dark-border/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-light/30">
                  Muren
                </span>
              </div>
              <div className="divide-y divide-dark-border/40">
                {/* Builder preview walls (geen geplaatste kamer geselecteerd) */}
                {previewVertices.length >= 3 && !selectedRoom && (
                  <div className="py-1.5">
                    <div className="px-2 pb-1">
                      <div
                        className={WALL_GRID}
                        onMouseLeave={() => setHoveredWall(null)}
                      >
                        {previewVertices.map((_, i) => {
                          const a = previewVertices[i]
                          const b = previewVertices[(i + 1) % previewVertices.length]
                          const lenRounded = Math.round(wallLength(a, b))
                          const locked = previewLockedWalls.includes(i)
                          return (
                            <WallMetricCell
                              key={`preview-w-${i}`}
                              wallIndex={i}
                              lenRounded={lenRounded}
                              isActive={selectedWallIndex === i}
                              locked={locked}
                              onSelect={() => setSelectedWallIndex(i)}
                              onLengthChange={v => handlePreviewWallLengthChange(i, v)}
                              onHoverStart={() =>
                                setHoveredWall({ roomKey: previewRoomKey, wallIndex: i })
                              }
                              lockSlot={
                                <button
                                  type="button"
                                  title={locked ? 'Ontgrendelen — lengte aanpasbaar' : 'Vergrendelen — lengte vast'}
                                  onClick={e => {
                                    e.stopPropagation()
                                    togglePreviewWallLock(i)
                                  }}
                                  className={[
                                    'shrink-0 text-[9px] leading-none px-1 py-0.5 rounded border transition-colors',
                                    locked
                                      ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                      : 'border-dark-border text-light/35 hover:text-light',
                                  ].join(' ')}
                                >
                                  {locked ? '🔒' : '🔓'}
                                </button>
                              }
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
                    <div key={roomId} className="py-1.5">
                      <div className="px-3 pb-1">
                        <span className="text-[10px] font-semibold text-light/50">
                          Kamer {roomIdx + 1}
                          {room.name ? (
                            <span className="font-normal text-light/35"> · {room.name}</span>
                          ) : null}
                        </span>
                      </div>
                      <div className="px-2 pb-1">
                        <div
                          className={WALL_GRID}
                          onMouseLeave={() => setHoveredWall(null)}
                        >
                          {room.vertices.map((_, i) => {
                            const a = room.vertices[i]
                            const b = room.vertices[(i + 1) % room.vertices.length]
                            const lenRounded = Math.round(wallLength(a, b))
                            const isActive =
                              selectedRoomId === roomId && selectedWallIndex === i
                            const locked = room.lockedWalls?.includes(i) ?? false
                            return (
                              <WallMetricCell
                                key={`${roomId}-w-${i}`}
                                wallIndex={i}
                                lenRounded={lenRounded}
                                isActive={isActive}
                                locked={locked}
                                onSelect={() => selectRoomWall(roomId, i)}
                                onLengthChange={v => handleWallLengthChange(roomId, i, v)}
                                onHoverStart={() =>
                                  setHoveredWall({ roomKey: roomId, wallIndex: i })
                                }
                                lockSlot={
                                  <button
                                    type="button"
                                    title={locked ? 'Ontgrendelen' : 'Vergrendelen'}
                                    onClick={e => {
                                      e.stopPropagation()
                                      blueprintStore.getState().toggleWallLock(roomId, i)
                                      if (selectedRoomId !== roomId) {
                                        blueprintStore.getState().select([roomId])
                                        setSelectedWallIndex(i)
                                      }
                                    }}
                                    className={[
                                      'shrink-0 text-[9px] leading-none px-1 py-0.5 rounded border transition-colors',
                                      locked
                                        ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                        : 'border-dark-border text-light/35 hover:text-light',
                                    ].join(' ')}
                                  >
                                    {locked ? '🔒' : '🔓'}
                                  </button>
                                }
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
          ) : null}

          {selectedRoom ? (
            <div className="px-3 py-2 border-t border-dark-border shrink-0">
              <button
                type="button"
                onClick={rotateRoom90}
                className="flex items-center gap-1.5 text-xs text-light/50 hover:text-light border border-dark-border hover:border-accent/40 rounded-lg px-3 py-1.5 transition-all duration-150"
              >
                <RotateCw size={12} />
                Roteer 90°
              </button>
            </div>
          ) : null}

        </div>

        {/* Column 3 — Builder panel (280px) */}
        <div className="w-[280px] shrink-0 border-l border-dark-border overflow-y-auto">
          <BuilderPanel
            onPreviewChange={setPreviewVertices}
            previewWidth={previewWidth}
            previewDepth={previewDepth}
            onWidthChange={setPreviewWidth}
            onDepthChange={setPreviewDepth}
          />
        </div>

      </div>
    </div>
  )
}
