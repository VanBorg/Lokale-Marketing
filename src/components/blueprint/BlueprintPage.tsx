import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import {
  blueprintStore,
  useBlueprintStore,
  useSelectedIds,
} from '../../store/blueprintStore'
import {
  applyWallLengthRespectingLocks,
  axisAlignedBBoxSize,
  formatNlDecimal,
  polygonArea,
  wallLength,
} from '../../utils/blueprintGeometry'
import type { Point } from '../../utils/blueprintGeometry'
import { useBlueprintKeyboard } from '../../hooks/useBlueprintKeyboard'
import { useBlueprintSave } from '../../hooks/useBlueprintSave'
import BlueprintTopBar from './BlueprintTopBar'
import BlueprintCanvas from './BlueprintCanvas'
import BuilderPanel from './BuilderPanel'
import RoomPreviewCanvas from './RoomPreviewCanvas'
import WallList from './WallList'
import type { Project } from '../../lib/database.types'

interface BlueprintPageProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onTabChange: (tab: string) => void
}

const KAMER_OVERVIEW_EDGE_PADDING_PX = 76

export default function BlueprintPage({ project, onUpdateProject, onTabChange }: BlueprintPageProps) {
  useEffect(() => {
    blueprintStore.getState().initProject(project.id)
  }, [project.id])

  const { loadProject } = useBlueprintSave(project.id)

  useEffect(() => {
    loadProject()
  }, [project.id, loadProject])

  useBlueprintKeyboard()

  const [previewVertices, setPreviewVertices] = useState<Point[]>([])
  const [previewLockedWalls, setPreviewLockedWalls] = useState<number[]>([])
  const [previewWidth, setPreviewWidth]  = useState(400)
  const [previewDepth, setPreviewDepth]  = useState(300)

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
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
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
    blueprintStore.getState().setWallLength(roomId, wallIndex, Math.max(10, value))
  }, [])

  const togglePreviewLock = useCallback((wallIndex: number) => {
    setPreviewLockedWalls(prev =>
      prev.includes(wallIndex) ? prev.filter(i => i !== wallIndex) : [...prev, wallIndex].sort((a, b) => a - b),
    )
  }, [])

  const handlePreviewWallLengthChange = useCallback((wallIndex: number, value: number) => {
    if (previewLockedWalls.includes(wallIndex)) return
    const clamped = Math.max(10, value)
    setPreviewVertices(prev =>
      applyWallLengthRespectingLocks(prev, wallIndex, clamped, previewLockedWalls),
    )
  }, [previewLockedWalls])

  const displayedRoomKey = selectedRoomId ?? previewRoomKey
  const listHoverWallIndex =
    hoveredWall && hoveredWall.roomKey === displayedRoomKey ? hoveredWall.wallIndex : null

  const planSpanW = selectedRoom
    ? (selectedRoom.planWidthCm ?? axisAlignedBBoxSize(selectedRoom.vertices).w)
    : previewWidth
  const planSpanH = selectedRoom
    ? (selectedRoom.planDepthCm ?? axisAlignedBBoxSize(selectedRoom.vertices).h)
    : previewDepth

  const showMuren = (previewVertices.length >= 3 && !selectedRoom) || roomOrder.length > 0

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <BlueprintTopBar
        project={project}
        onUpdateProject={onUpdateProject}
        onTabChange={onTabChange}
      />

      <div className="flex flex-1 min-h-0">
        {/* Column 1 — Plattegrond */}
        <div className="flex-[5] min-w-0 min-h-0 relative overflow-hidden flex flex-col">
          <BlueprintCanvas />

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

        {/* Column 2 — Kamer Overview */}
        <div className="flex-[3] min-w-0 min-h-0 border-l border-dark-border bg-dark flex flex-col overflow-y-auto">

          <div className="px-3 py-2 border-b border-dark-border shrink-0" aria-hidden="true" />

          <div
            ref={previewWrapRef}
            className="w-full min-w-0 px-5 pt-3 pb-3 border-b border-dark-border shrink-0 flex justify-center"
          >
            <RoomPreviewCanvas
              edgePaddingPx={KAMER_OVERVIEW_EDGE_PADDING_PX}
              planSpanWidthCm={planSpanW}
              planSpanDepthCm={planSpanH}
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
              draftLockedWalls={selectedRoom ? undefined : previewLockedWalls}
              onDraftToggleLock={selectedRoom ? undefined : togglePreviewLock}
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

          {/* Geselecteerde wand detail voor geplaatste kamer */}
          {selectedRoom &&
            selectedWallIndex !== null &&
            selectedWallIndex >= 0 &&
            selectedWallIndex < selectedRoom.vertices.length && (
              <div className="px-5 pb-3 border-b border-dark-border shrink-0 space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    blueprintStore.getState().toggleWallLock(selectedRoom.id, selectedWallIndex)
                  }
                  className={[
                    'w-full text-xs py-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5',
                    selectedRoom.lockedWalls.includes(selectedWallIndex)
                      ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                      : 'border-dark-border text-light/55 hover:border-orange-500/40 hover:text-orange-400/90 hover:bg-orange-500/5',
                  ].join(' ')}
                >
                  {selectedRoom.lockedWalls.includes(selectedWallIndex) ? '🔒 ' : '🔓 '}
                  Wand vergrendelen
                </button>
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

          {/* Wandraster */}
          {showMuren && (
            <WallList
              previewVertices={previewVertices}
              previewLockedWalls={previewLockedWalls}
              onTogglePreviewLock={togglePreviewLock}
              onPreviewWallLengthChange={handlePreviewWallLengthChange}
              rooms={rooms}
              roomOrder={roomOrder}
              selectedRoomId={selectedRoomId}
              selectedWallIndex={selectedWallIndex}
              canvasHoveredWallIndex={canvasHoveredWallIndex}
              displayedRoomKey={displayedRoomKey}
              onSetHoveredWall={setHoveredWall}
              onSetSelectedWallIndex={setSelectedWallIndex}
              onRoomWallLengthChange={handleWallLengthChange}
            />
          )}

          {selectedRoom && (
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
          )}

        </div>

        {/* Column 3 — Bouwer */}
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
