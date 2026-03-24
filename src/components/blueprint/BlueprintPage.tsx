import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import {
  blueprintStore,
  useBlueprintStore,
  useSelectedIds,
} from '../../store/blueprintStore'
import {
  applyWallLengthRespectingLocks,
  formatNlDecimal,
  mergeWallLockIndices,
  polygonArea,
  wallLength,
} from '../../utils/blueprintGeometry'
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
  'grid w-full grid-cols-4 gap-0.5 rounded-md border border-dark-border bg-dark-border/80 overflow-hidden'

/** Meer lucht rond de preview-tekening; zelfde kamer-coördinaten, kleinere schaal in het stage. */
const KAMER_OVERVIEW_EDGE_PADDING_PX = 76

function WallMetricCell({
  wallIndex,
  lengthCm,
  isActive,
  isCanvasHovered = false,
  onSelect,
  onLengthChange,
  onHoverStart,
  lengthLocked,
  geometryLocked,
  onToggleLengthLock,
  onToggleGeometryLock,
}: {
  wallIndex: number
  /** Wandlengte in centimeters (brondata). */
  lengthCm: number
  isActive: boolean
  /** Softer highlight when this wall is hovered on the preview canvas. */
  isCanvasHovered?: boolean
  onSelect: () => void
  /** Teruggeven in centimeters (store blijft cm). */
  onLengthChange: (valueCm: number) => void
  onHoverStart?: () => void
  lengthLocked: boolean
  geometryLocked: boolean
  onToggleLengthLock: () => void
  onToggleGeometryLock: () => void
}) {
  /** Alleen L-slot blokkeert invoer; M-slot niet — lengte mag via cijfers/keten terwijl muur vast staat. */
  const lengthReadOnly = lengthLocked
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive && cellRef.current) {
      cellRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isActive])

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(null)
    }
  }, [lengthCm])

  const metersDisplay = formatNlDecimal(lengthCm / 100, 2)

  const commitDraft = () => {
    if (lengthReadOnly) return
    const raw = (draft ?? '').trim()
    if (raw === '') {
      setDraft(null)
      return
    }
    const meters = parseFloat(raw.replace(',', '.'))
    if (Number.isNaN(meters) || meters < 0.1) {
      setDraft(null)
      return
    }
    const cm = Math.max(10, Math.round(meters * 100))
    onLengthChange(cm)
    setDraft(null)
  }

  const displayValue = draft !== null ? draft : metersDisplay

  return (
      <div
        ref={cellRef}
        role="button"
        tabIndex={0}
        aria-label={`Wand ${wallIndex + 1}, lengte in meters${lengthReadOnly ? ', lengte vergrendeld (L)' : ''}`}
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
        'bg-dark px-1.5 py-1 min-h-0 flex flex-nowrap items-center justify-center gap-1.5 min-w-0 transition-all duration-200 cursor-pointer border border-transparent',
        lengthReadOnly ? 'opacity-90' : '',
        isActive
          ? 'ring-1 ring-inset ring-accent/40 bg-accent/[0.06]'
          : isCanvasHovered
            ? 'bg-accent/[0.04] border-accent/20'
            : 'hover:bg-light/[0.06] hover:border-light/15',
      ].join(' ')}
    >
      <div className="flex flex-col gap-px shrink-0">
        <button
          type="button"
          title={
            lengthLocked
              ? 'Ontgrendel lengte (L) — meterwaarde weer wijzigbaar waar toegestaan'
              : 'Vergrendel lengte (L) — deze meterwaarde niet wijzigen'
          }
          onClick={e => {
            e.stopPropagation()
            onToggleLengthLock()
          }}
          className={[
            'flex flex-row flex-nowrap items-center justify-center gap-0.5 px-1 py-0 rounded border transition-all duration-200 h-6 min-w-[2.25rem] max-w-[3rem] overflow-hidden whitespace-nowrap',
            lengthLocked
              ? 'border-orange-500/50 text-orange-400 bg-orange-500/10'
              : 'border-dark-border text-light/40 hover:border-orange-500/50 hover:text-orange-400/90 hover:bg-orange-500/5',
          ].join(' ')}
        >
          {lengthLocked && (
            <span className="text-[7px] leading-none shrink-0" aria-hidden>
              🔒
            </span>
          )}
          <span className="font-semibold leading-none text-[11px]">L</span>
        </button>
        <button
          type="button"
          title={geometryLocked ? 'Ontgrendel muur — slepen weer mogelijk' : 'Vergrendel muur — vast op plattegrond'}
          onClick={e => {
            e.stopPropagation()
            onToggleGeometryLock()
          }}
          className={[
            'flex flex-row flex-nowrap items-center justify-center gap-0.5 px-1 py-0 rounded border transition-all duration-200 h-6 min-w-[2.25rem] max-w-[3rem] overflow-hidden whitespace-nowrap',
            geometryLocked
              ? 'border-orange-500/50 text-orange-400 bg-orange-500/10'
              : 'border-dark-border text-light/40 hover:border-orange-500/50 hover:text-orange-400/90 hover:bg-orange-500/5',
          ].join(' ')}
        >
          {geometryLocked && (
            <span className="text-[7px] leading-none shrink-0" aria-hidden>
              🔒
            </span>
          )}
          <span className="font-semibold leading-none text-[11px]">M</span>
        </button>
      </div>
      <div className="flex min-w-0 shrink flex-nowrap items-center gap-0.5">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          readOnly={lengthReadOnly}
          title={lengthReadOnly ? undefined : 'Lengte in meters (bijv. 1,12) — Enter om toe te passen'}
          className={[
            'ui-input text-sm py-0.5 h-7 min-w-[3.5rem] w-[3.5rem] text-center tabular-nums px-0.5 font-medium shrink-0',
            lengthReadOnly ? 'cursor-not-allowed opacity-70' : '',
          ].join(' ')}
          value={displayValue}
          onClick={e => e.stopPropagation()}
          onFocus={() => {
            if (!lengthReadOnly) setDraft(metersDisplay)
          }}
          onChange={e => {
            if (lengthReadOnly) return
            setDraft(e.target.value)
          }}
          onBlur={() => {
            setDraft(null)
          }}
          onKeyDown={e => {
            if (lengthReadOnly) return
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
              const fromDraftM =
                draft !== null ? parseFloat(draft.replace(',', '.')) : lengthCm / 100
              const curCm = Number.isNaN(fromDraftM) ? lengthCm : Math.round(fromDraftM * 100)
              setDraft(formatNlDecimal(Math.max(10, curCm + 5) / 100, 2))
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              const fromDraftM =
                draft !== null ? parseFloat(draft.replace(',', '.')) : lengthCm / 100
              const curCm = Number.isNaN(fromDraftM) ? lengthCm : Math.round(fromDraftM * 100)
              setDraft(formatNlDecimal(Math.max(10, curCm - 5) / 100, 2))
            }
          }}
        />
        <span className="text-[10px] text-light/40 shrink-0 tabular-nums">m</span>
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
  const [previewGeometryLockedWalls, setPreviewGeometryLockedWalls] = useState<number[]>([])
  const [previewLengthLockedWalls, setPreviewLengthLockedWalls] = useState<number[]>([])
  const [previewWidth, setPreviewWidth]       = useState(400)
  const [previewDepth, setPreviewDepth]       = useState(300)

  const selectedIds    = useSelectedIds()
  const selectedRoomId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedRoom   = useBlueprintStore(s => selectedRoomId ? s.rooms[selectedRoomId] : null)
  const roomOrder      = useBlueprintStore(s => s.roomOrder)
  const rooms          = useBlueprintStore(s => s.rooms)

  const [selectedWallIndex, setSelectedWallIndex] = useState<number | null>(null)
  const [hoveredWall, setHoveredWall] = useState<{ roomKey: string; wallIndex: number } | null>(null)
  const [canvasHoveredWallIndex, setCanvasHoveredWallIndex] = useState<number | null>(null)

  const previewRoomKey = 'preview'

  const previewWrapRef = useRef<HTMLDivElement>(null)
  const [previewStageSize, setPreviewStageSize] = useState({ w: 280, h: 248 })

  useEffect(() => {
    const el = previewWrapRef.current
    if (!el) return
    const update = () => {
      const cs = window.getComputedStyle(el)
      const padX =
        (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
      const innerW = Math.max(200, Math.floor(el.clientWidth - padX))
      const h = Math.max(180, Math.floor(innerW * 0.89))
      setPreviewStageSize(s => (s.w === innerW && s.h === h ? s : { w: innerW, h }))
    }
    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setSelectedWallIndex(null)
    setHoveredWall(null)
    setCanvasHoveredWallIndex(null)
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
    if (!r) return
    if (r.lengthLockedWalls?.includes(wallIndex)) return
    const clamped = Math.max(10, value)
    blueprintStore.getState().setWallLength(roomId, wallIndex, clamped)
  }, [])

  const togglePreviewGeometryLock = useCallback((wallIndex: number) => {
    setPreviewGeometryLockedWalls(prev => {
      if (prev.includes(wallIndex)) return prev.filter(i => i !== wallIndex)
      return [...prev, wallIndex].sort((a, b) => a - b)
    })
  }, [])

  const togglePreviewLengthLock = useCallback((wallIndex: number) => {
    setPreviewLengthLockedWalls(prev => {
      if (prev.includes(wallIndex)) return prev.filter(i => i !== wallIndex)
      return [...prev, wallIndex].sort((a, b) => a - b)
    })
  }, [])

  const handlePreviewWallLengthChange = useCallback((wallIndex: number, value: number) => {
    if (previewLengthLockedWalls.includes(wallIndex)) return
    const clamped = Math.max(10, value)
    const locks = mergeWallLockIndices(previewGeometryLockedWalls, previewLengthLockedWalls)
    setPreviewVertices(prev => applyWallLengthRespectingLocks(prev, wallIndex, clamped, locks))
  }, [previewGeometryLockedWalls, previewLengthLockedWalls])

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
        {/* 5:3:2 = 50% plattegrond, 30% Kamer overview, 20% Bouwer (60/40 van rechter helft) */}
        {/* Column 1 — Plattegrond */}
        <div className="flex-[5] min-w-0 relative overflow-hidden flex flex-col">
          <BlueprintCanvas />

          {/* Floating selection bar — appears when exactly one room is selected */}
          {selectedRoom && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-dark-card border border-dark-border rounded-lg px-3 py-2 shadow-lg pointer-events-auto">
              <span className="text-xs font-semibold text-light">{selectedRoom.name}</span>
              <span className="text-xs text-light/40">
                {formatNlDecimal(polygonArea(selectedRoom.vertices) / 10000, 1)} m²
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

        {/* Column 2 — Kamer Overview (60% van rechter helft scherm) */}
        <div className="flex-[3] min-w-0 min-h-0 border-l border-dark-border bg-dark flex flex-col overflow-y-auto">

          {/* 1. Header */}
          <div className="px-3 py-2 border-b border-dark-border shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
              Kamer Overview
            </span>
          </div>

          {/* 2. RoomPreviewCanvas — schaalt met kolombreedte */}
          <div
            ref={previewWrapRef}
            className="w-full min-w-0 px-5 pt-3 pb-3 border-b border-dark-border shrink-0 flex justify-center"
          >
            <RoomPreviewCanvas
              edgePaddingPx={KAMER_OVERVIEW_EDGE_PADDING_PX}
              vertices={selectedRoom ? selectedRoom.vertices : previewVertices}
              onChange={selectedRoom
                ? (verts) => blueprintStore.getState().updateRoomVertices(selectedRoom.id, verts)
                : setPreviewVertices
              }
              onDimensionChange={selectedRoom
                ? undefined
                : (w, d) => { setPreviewWidth(w); setPreviewDepth(d) }
              }
              width={previewStageSize.w}
              height={previewStageSize.h}
              room={selectedRoom}
              onToggleWallLock={selectedRoom
                ? (wallIndex) => blueprintStore.getState().toggleWallLock(selectedRoom.id, wallIndex)
                : undefined
              }
              onToggleWallLengthLock={selectedRoom
                ? (wallIndex) => blueprintStore.getState().toggleWallLengthLock(selectedRoom.id, wallIndex)
                : undefined
              }
              draftGeometryLockedWalls={selectedRoom ? undefined : previewGeometryLockedWalls}
              draftLengthLockedWalls={selectedRoom ? undefined : previewLengthLockedWalls}
              onDraftToggleGeometryLock={selectedRoom ? undefined : togglePreviewGeometryLock}
              onDraftToggleLengthLock={selectedRoom ? undefined : togglePreviewLengthLock}
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
              onHoverWall={setCanvasHoveredWallIndex}
            />
          </div>

          {selectedRoom &&
            selectedWallIndex !== null &&
            selectedWallIndex >= 0 &&
            selectedWallIndex < selectedRoom.vertices.length && (
              <div className="px-5 pb-3 border-b border-dark-border shrink-0 space-y-2">
                <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto w-full">
                  <button
                    type="button"
                    onClick={() =>
                      blueprintStore.getState().toggleWallLengthLock(selectedRoom.id, selectedWallIndex)
                    }
                    className={[
                      'text-xs py-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5',
                      selectedRoom.lengthLockedWalls?.includes(selectedWallIndex)
                        ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                        : 'border-dark-border text-light/55 hover:border-orange-500/40 hover:text-orange-400/90 hover:bg-orange-500/5',
                    ].join(' ')}
                  >
                    {selectedRoom.lengthLockedWalls?.includes(selectedWallIndex) ? '🔒 ' : '🔓 '}
                    Lengte
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      blueprintStore.getState().toggleWallLock(selectedRoom.id, selectedWallIndex)
                    }
                    className={[
                      'text-xs py-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5',
                      selectedRoom.lockedWalls.includes(selectedWallIndex)
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                        : 'border-dark-border text-light/55 hover:border-amber-500/45 hover:text-amber-400/90 hover:bg-amber-500/5',
                    ].join(' ')}
                  >
                    {selectedRoom.lockedWalls.includes(selectedWallIndex) ? '🔒' : '🔓'} Muur
                  </button>
                </div>
                <p className="text-center text-xs text-light/45 tabular-nums">
                  {formatNlDecimal(
                    wallLength(
                      selectedRoom.vertices[selectedWallIndex],
                      selectedRoom.vertices[(selectedWallIndex + 1) % selectedRoom.vertices.length],
                    ) / 100,
                    2,
                  )}{' '}
                  m · wand {selectedWallIndex + 1}
                </p>
              </div>
            )}

          {/* 3. Wandraster — concept + geplaatste kamers */}
          {showMuren ? (
            <div className="shrink-0 border-t border-dark-border/50">
              <div className="divide-y divide-dark-border/40">
                {/* Builder preview walls (geen geplaatste kamer geselecteerd) */}
                {previewVertices.length >= 3 && !selectedRoom && (
                  <div className="py-2.5">
                    <div className="px-2 pb-1.5">
                      <div
                        className={WALL_GRID}
                        onMouseLeave={() => setHoveredWall(null)}
                      >
                        {previewVertices.map((_, i) => {
                          const a = previewVertices[i]
                          const b = previewVertices[(i + 1) % previewVertices.length]
                          const lengthCm = Math.round(wallLength(a, b))
                          const geometryLocked = previewGeometryLockedWalls.includes(i)
                          const lengthLocked = previewLengthLockedWalls.includes(i)
                          const isCanvasHovered =
                            canvasHoveredWallIndex === i && displayedRoomKey === previewRoomKey
                          return (
                            <WallMetricCell
                              key={`preview-w-${i}`}
                              wallIndex={i}
                              lengthCm={lengthCm}
                              isActive={selectedWallIndex === i}
                              isCanvasHovered={isCanvasHovered}
                              lengthLocked={lengthLocked}
                              geometryLocked={geometryLocked}
                              onToggleLengthLock={() => togglePreviewLengthLock(i)}
                              onToggleGeometryLock={() => togglePreviewGeometryLock(i)}
                              onSelect={() => setSelectedWallIndex(i)}
                              onLengthChange={v => handlePreviewWallLengthChange(i, v)}
                              onHoverStart={() =>
                                setHoveredWall({ roomKey: previewRoomKey, wallIndex: i })
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
                    <div key={roomId} className="py-2.5">
                      <div className="px-3 pb-1.5">
                        <span className="text-xs font-semibold text-light/55">
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
                            const lengthCm = Math.round(wallLength(a, b))
                            const isActive =
                              selectedRoomId === roomId && selectedWallIndex === i
                            const isCanvasHovered =
                              canvasHoveredWallIndex === i && displayedRoomKey === roomId
                            const geometryLocked = room.lockedWalls?.includes(i) ?? false
                            const lengthLocked = room.lengthLockedWalls?.includes(i) ?? false
                            return (
                              <WallMetricCell
                                key={`${roomId}-w-${i}`}
                                wallIndex={i}
                                lengthCm={lengthCm}
                                isActive={isActive}
                                isCanvasHovered={isCanvasHovered}
                                lengthLocked={lengthLocked}
                                geometryLocked={geometryLocked}
                                onToggleLengthLock={() => {
                                  blueprintStore.getState().toggleWallLengthLock(roomId, i)
                                  if (selectedRoomId !== roomId) {
                                    blueprintStore.getState().select([roomId])
                                    setSelectedWallIndex(i)
                                  }
                                }}
                                onToggleGeometryLock={() => {
                                  blueprintStore.getState().toggleWallLock(roomId, i)
                                  if (selectedRoomId !== roomId) {
                                    blueprintStore.getState().select([roomId])
                                    setSelectedWallIndex(i)
                                  }
                                }}
                                onSelect={() => selectRoomWall(roomId, i)}
                                onLengthChange={v => handleWallLengthChange(roomId, i, v)}
                                onHoverStart={() =>
                                  setHoveredWall({ roomKey: roomId, wallIndex: i })
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

        {/* Column 3 — Bouwer (40% van rechter helft scherm) */}
        <div className="flex-[2] min-w-0 min-h-0 border-l border-dark-border overflow-y-auto">
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
