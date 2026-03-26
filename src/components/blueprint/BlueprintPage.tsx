import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import {
  blueprintStore,
  useBlueprintStore,
  useSelectedIds,
} from '../../store/blueprintStore'
import {
  applyWallLengthRespectingLocks,
  axisAlignedBBoxSize,
  formatNlDecimal,
  generateShapeVertices,
  parseMetersInputToCm,
  wallLength,
} from '../../utils/blueprintGeometry'
import type { Point } from '../../utils/blueprintGeometry'
import { useBlueprintKeyboard } from '../../hooks/useBlueprintKeyboard'
import EditorPage from '../../editor/EditorPage'
import PixelCanvas from '../../editor/canvas/PixelCanvas'
import BuilderPanel from './BuilderPanel'
import RoomPreviewCanvas from './RoomPreviewCanvas'
import RoomListOverlay from './RoomListOverlay'
import WallList from './WallList'
import type { Project } from '../../lib/database.types'

interface BlueprintPageProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onTabChange: (tab: string) => void
}

/** Undo-stack alleen voor de kamer-preview (kolom 2), los van plattegrond temporal. */
interface PreviewSnapshot {
  vertices: Point[]
  previewWidth: number
  previewDepth: number
  lockedWalls: number[]
  canvasPreviewEdited: boolean
}

function snapshotFromRef(ref: {
  previewVertices: Point[]
  previewWidth: number
  previewDepth: number
  previewLockedWalls: number[]
  canvasPreviewEdited: boolean
}): PreviewSnapshot {
  return {
    vertices: ref.previewVertices.map(p => ({ ...p })),
    previewWidth: ref.previewWidth,
    previewDepth: ref.previewDepth,
    lockedWalls: [...ref.previewLockedWalls],
    canvasPreviewEdited: ref.canvasPreviewEdited,
  }
}

function clonePreviewSnapshot(s: PreviewSnapshot): PreviewSnapshot {
  return {
    vertices: s.vertices.map(p => ({ ...p })),
    previewWidth: s.previewWidth,
    previewDepth: s.previewDepth,
    lockedWalls: [...s.lockedWalls],
    canvasPreviewEdited: s.canvasPreviewEdited,
  }
}

const KAMER_OVERVIEW_EDGE_PADDING_PX = 76
const DEFAULT_PREVIEW_WIDTH_CM = 800
const DEFAULT_PREVIEW_DEPTH_CM = 800
/** Snelle L×B-invoer op de kamerkaart (cm). */
const QUICK_KAMER_MIN_CM = 10
const QUICK_KAMER_MAX_CM = 5000

function QuickKamerAfmetingenFields({
  widthCm,
  depthCm,
  resetNonce,
  onApply,
}: {
  widthCm: number
  depthCm: number
  resetNonce: number
  onApply: (wCm: number, dCm: number) => void
}) {
  const [lDraft, setLDraft] = useState<string | null>(null)
  const [bDraft, setBDraft] = useState<string | null>(null)

  useEffect(() => {
    setLDraft(null)
    setBDraft(null)
  }, [resetNonce, widthCm, depthCm])

  const commitL = () => {
    if (lDraft === null) return
    const raw = lDraft.trim()
    if (raw === '') {
      setLDraft(null)
      return
    }
    const cm = parseMetersInputToCm(raw)
    if (cm === null) {
      setLDraft(null)
      return
    }
    const w = Math.max(QUICK_KAMER_MIN_CM, Math.min(QUICK_KAMER_MAX_CM, cm))
    onApply(w, depthCm)
    setLDraft(null)
  }

  const commitB = () => {
    if (bDraft === null) return
    const raw = bDraft.trim()
    if (raw === '') {
      setBDraft(null)
      return
    }
    const cm = parseMetersInputToCm(raw)
    if (cm === null) {
      setBDraft(null)
      return
    }
    const d = Math.max(QUICK_KAMER_MIN_CM, Math.min(QUICK_KAMER_MAX_CM, cm))
    onApply(widthCm, d)
    setBDraft(null)
  }

  const lenShown = lDraft !== null ? lDraft : formatNlDecimal(widthCm / 100, 2)
  const breShown = bDraft !== null ? bDraft : formatNlDecimal(depthCm / 100, 2)

  const fieldClass =
    'ui-input w-full text-sm py-1.5 tabular-nums theme-light:bg-white'

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 min-w-0">
        <span className="ui-label">Lengte in m</span>
        <input
          type="text"
          inputMode="decimal"
          className={fieldClass}
          value={lenShown}
          onChange={e => setLDraft(e.target.value)}
          onBlur={commitL}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
        />
      </label>
      <label className="flex flex-col gap-1 min-w-0">
        <span className="ui-label">Breedte in m</span>
        <input
          type="text"
          inputMode="decimal"
          className={fieldClass}
          value={breShown}
          onChange={e => setBDraft(e.target.value)}
          onBlur={commitB}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
        />
      </label>
    </div>
  )
}

export default function BlueprintPage({ project, onUpdateProject, onTabChange }: BlueprintPageProps) {
  useBlueprintKeyboard()

  const [previewVertices, setPreviewVertices] = useState<Point[]>([])
  /** True na slepen in preview / wandlengte; false na sync vanuit formulier — nodig om draaien niet naar preset te resetten. */
  const [canvasPreviewEdited, setCanvasPreviewEdited] = useState(false)
  const [previewLockedWalls, setPreviewLockedWalls] = useState<number[]>([])
  const [previewPast, setPreviewPast] = useState<PreviewSnapshot[]>([])
  const [previewFuture, setPreviewFuture] = useState<PreviewSnapshot[]>([])
  const skipPreviewHistoryRef = useRef(false)
  const [previewWidth, setPreviewWidth]  = useState(DEFAULT_PREVIEW_WIDTH_CM)
  const [previewDepth, setPreviewDepth]  = useState(DEFAULT_PREVIEW_DEPTH_CM)
  const [builderStep, setBuilderStep] = useState(0)
  /** Verhoog om BuilderPanel intern te resetten naar “nieuwe kamer” (stap 0). */
  const [builderResetNonce, setBuilderResetNonce] = useState(0)
  const [selectedWallIndex, setSelectedWallIndex] = useState<number | null>(null)
  const [hoveredWall, setHoveredWall] = useState<{ roomKey: string; wallIndex: number } | null>(null)
  const [canvasHoveredWallIndex, setCanvasHoveredWallIndex] = useState<number | null>(null)
  const previewRoomKey = 'preview'
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const [previewStageSize, setPreviewStageSize] = useState({ w: 280, h: 248 })

  const selectedIds    = useSelectedIds()
  const selectedRoomId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedRoom   = useBlueprintStore(s => selectedRoomId ? s.rooms[selectedRoomId] : null)
  const selectedCanvasNote = useBlueprintStore(s => {
    const first = s.selectedCanvasTextNoteIds[0]
    return first ? s.canvasTextNotes[first] : null
  })
  const roomOrder      = useBlueprintStore(s => s.roomOrder)
  const rooms          = useBlueprintStore(s => s.rooms)

  // When a room is selected we never show the stale new-room draft — always prefer the placed room.
  const showingNewPreview = builderStep === 0 && previewVertices.length >= 3 && !selectedRoom
  /** Alleen nieuwe-kamer-preview (geen geselecteerde plattegrond-kamer), anders Kamerkaart → temporal. */
  const isPreviewDraftUndoActive = showingNewPreview && !selectedRoom

  const canTemporalUndo = useStore(
    blueprintStore.temporal,
    s => s.pastStates.length > 0,
  )
  const canTemporalRedo = useStore(
    blueprintStore.temporal,
    s => s.futureStates.length > 0,
  )
  const canBlueprintUndo = isPreviewDraftUndoActive ? previewPast.length > 0 : canTemporalUndo
  const canBlueprintRedo = isPreviewDraftUndoActive ? previewFuture.length > 0 : canTemporalRedo

  const stateRef = useRef({
    previewVertices,
    previewWidth,
    previewDepth,
    previewLockedWalls,
    canvasPreviewEdited,
  })
  stateRef.current = {
    previewVertices,
    previewWidth,
    previewDepth,
    previewLockedWalls,
    canvasPreviewEdited,
  }

  const pushPreviewHistory = useCallback(() => {
    if (skipPreviewHistoryRef.current) return
    if (!isPreviewDraftUndoActive) return
    const snap = snapshotFromRef(stateRef.current)
    setPreviewPast(p => [...p.slice(-49), snap])
    setPreviewFuture([])
  }, [isPreviewDraftUndoActive])

  const previewUndo = useCallback(() => {
    if (!isPreviewDraftUndoActive) return
    setPreviewPast(past => {
      if (past.length === 0) return past
      const prevSnap = past[past.length - 1]
      const currentSnap = snapshotFromRef(stateRef.current)
      skipPreviewHistoryRef.current = true
      setPreviewFuture(f => [clonePreviewSnapshot(currentSnap), ...f])
      setPreviewVertices(prevSnap.vertices.map(p => ({ ...p })))
      setPreviewWidth(prevSnap.previewWidth)
      setPreviewDepth(prevSnap.previewDepth)
      setPreviewLockedWalls([...prevSnap.lockedWalls])
      setCanvasPreviewEdited(prevSnap.canvasPreviewEdited)
      setTimeout(() => {
        skipPreviewHistoryRef.current = false
      }, 0)
      return past.slice(0, -1)
    })
  }, [isPreviewDraftUndoActive])

  const previewRedo = useCallback(() => {
    if (!isPreviewDraftUndoActive) return
    setPreviewFuture(future => {
      if (future.length === 0) return future
      const nextSnap = future[0]
      const currentSnap = snapshotFromRef(stateRef.current)
      skipPreviewHistoryRef.current = true
      setPreviewPast(p => [...p, clonePreviewSnapshot(currentSnap)])
      setPreviewVertices(nextSnap.vertices.map(p => ({ ...p })))
      setPreviewWidth(nextSnap.previewWidth)
      setPreviewDepth(nextSnap.previewDepth)
      setPreviewLockedWalls([...nextSnap.lockedWalls])
      setCanvasPreviewEdited(nextSnap.canvasPreviewEdited)
      setTimeout(() => {
        skipPreviewHistoryRef.current = false
      }, 0)
      return future.slice(1)
    })
  }, [isPreviewDraftUndoActive])

  const handleKamerkaartUndo = useCallback(() => {
    if (isPreviewDraftUndoActive) previewUndo()
    else blueprintStore.temporal.getState().undo()
  }, [isPreviewDraftUndoActive, previewUndo])

  const handleKamerkaartRedo = useCallback(() => {
    if (isPreviewDraftUndoActive) previewRedo()
    else blueprintStore.temporal.getState().redo()
  }, [isPreviewDraftUndoActive, previewRedo])

  useEffect(() => {
    if (!isPreviewDraftUndoActive) {
      setPreviewPast([])
      setPreviewFuture([])
    }
  }, [isPreviewDraftUndoActive])

  useEffect(() => {
    setPreviewPast([])
    setPreviewFuture([])
  }, [project.id])

  useEffect(() => {
    const el = previewWrapRef.current
    if (!el) return
    const update = () => {
      requestAnimationFrame(() => {
        const cs = window.getComputedStyle(el)
        const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
        const innerW = Math.max(200, Math.floor(el.clientWidth - padX))
        const h = Math.max(180, Math.floor(innerW * 0.89))
        setPreviewStageSize(s => (s.w === innerW && s.h === h ? s : { w: innerW, h }))
      })
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

  const handleDeleteCanvasTextNote = () => {
    const store = blueprintStore.getState()
    if (store.editingCanvasTextNoteId) return
    if (store.selectedCanvasTextNoteIds.length === 0) return
    store.deleteSelectionBulk()
  }

  const handleWallLengthChange = useCallback((roomId: string, wallIndex: number, value: number) => {
    blueprintStore.getState().setWallLength(roomId, wallIndex, Math.max(10, value))
  }, [])

  const togglePreviewLock = useCallback((wallIndex: number) => {
    pushPreviewHistory()
    setPreviewLockedWalls(prev =>
      prev.includes(wallIndex) ? prev.filter(i => i !== wallIndex) : [...prev, wallIndex].sort((a, b) => a - b),
    )
  }, [pushPreviewHistory])

  const applyPreviewFromForm = useCallback((v: Point[]) => {
    pushPreviewHistory()
    setCanvasPreviewEdited(false)
    setPreviewVertices(v)
  }, [pushPreviewHistory])

  const applyPreviewFromCanvas = useCallback((v: Point[] | ((prev: Point[]) => Point[])) => {
    pushPreviewHistory()
    setCanvasPreviewEdited(true)
    setPreviewVertices(v)
  }, [pushPreviewHistory])

  const handlePreviewWallLengthChange = useCallback((wallIndex: number, value: number) => {
    if (previewLockedWalls.includes(wallIndex)) return
    const clamped = Math.max(10, value)
    applyPreviewFromCanvas(prev =>
      applyWallLengthRespectingLocks(prev, wallIndex, clamped, previewLockedWalls),
    )
  }, [previewLockedWalls, applyPreviewFromCanvas])

  const startNewRoom = useCallback(() => {
    blueprintStore.getState().clearSelection()
    setPreviewPast([])
    setPreviewFuture([])
    setPreviewLockedWalls([])
    setCanvasPreviewEdited(false)
    setPreviewWidth(DEFAULT_PREVIEW_WIDTH_CM)
    setPreviewDepth(DEFAULT_PREVIEW_DEPTH_CM)
    setPreviewVertices(
      generateShapeVertices('rechthoek', DEFAULT_PREVIEW_WIDTH_CM, DEFAULT_PREVIEW_DEPTH_CM),
    )
    setBuilderResetNonce(n => n + 1)
  }, [])

  /** Step 0: nieuwe preview in kolom 2 — ook bij geselecteerde kamer zodat rotatie zichtbaar blijft. */
  const displayedRoomKey = showingNewPreview ? previewRoomKey : (selectedRoomId ?? previewRoomKey)
  const listHoverWallIndex =
    hoveredWall && hoveredWall.roomKey === displayedRoomKey ? hoveredWall.wallIndex : null

  /** Bij nieuwe preview: span = bbox van echte vertices (zelfde als geplaatste kamer); anders springt de schaal bij wisselen Wanden ↔ Kamer. */
  const previewBbox =
    showingNewPreview && previewVertices.length >= 3
      ? axisAlignedBBoxSize(previewVertices)
      : null
  const planSpanW = showingNewPreview
    ? (previewBbox?.w ?? previewWidth)
    : selectedRoom
    ? (selectedRoom.planWidthCm ?? axisAlignedBBoxSize(selectedRoom.vertices).w)
    : previewWidth
  const planSpanH = showingNewPreview
    ? (previewBbox?.h ?? previewDepth)
    : selectedRoom
    ? (selectedRoom.planDepthCm ?? axisAlignedBBoxSize(selectedRoom.vertices).h)
    : previewDepth

  const showMuren = (previewVertices.length >= 3 && !selectedRoom) || roomOrder.length > 0
  const showQuickKamerMaat = previewVertices.length >= 3 && !selectedRoom

  const applyQuickKamerAfmetingen = useCallback(
    (wCm: number, dCm: number) => {
      if (wCm === previewWidth && dCm === previewDepth) return
      pushPreviewHistory()
      setPreviewLockedWalls([])
      setCanvasPreviewEdited(false)
      setPreviewWidth(wCm)
      setPreviewDepth(dCm)
      setPreviewVertices(generateShapeVertices('rechthoek', wCm, dCm))
    },
    [previewWidth, previewDepth, pushPreviewHistory],
  )

  return (
    <EditorPage
      project={project}
      onUpdateProject={onUpdateProject}
      onTabChange={onTabChange}
      undoRedo={{
        canUndo: canBlueprintUndo,
        canRedo: canBlueprintRedo,
        onUndo: handleKamerkaartUndo,
        onRedo: handleKamerkaartRedo,
      }}
    >
      <div className="flex flex-1 min-h-0">
        {/* Column 1 — Plattegrond */}
        <div className="flex-[5] min-w-0 min-h-0 relative overflow-hidden flex flex-col">
          <PixelCanvas />

          <RoomListOverlay onStartNewRoom={startNewRoom} />

          {selectedCanvasNote && !selectedRoom && (
            <div className="absolute bottom-3 left-3 z-20 flex max-w-[min(100%,20rem)] items-center gap-2 bg-dark-card border border-dark-border rounded-lg px-3 py-2 shadow-lg pointer-events-auto">
              <span className="truncate text-xs font-semibold text-light" title={selectedCanvasNote.text}>
                {selectedCanvasNote.text.trim() ? selectedCanvasNote.text.trim().split('\n')[0] : 'Tekstnotitie'}
              </span>
              <div className="w-px h-4 shrink-0 bg-dark-border mx-0.5" />
              <button
                type="button"
                onClick={() => blueprintStore.getState().openCanvasTextNoteEditor(selectedCanvasNote.id)}
                className="shrink-0 text-xs text-accent hover:text-accent/90 transition-colors"
                title="Tekst bewerken"
              >
                Bewerken
              </button>
              <button
                onClick={() => blueprintStore.getState().clearSelection()}
                className="shrink-0 text-xs text-light/50 hover:text-light transition-colors"
                title="Deselecteer"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={handleDeleteCanvasTextNote}
                className="shrink-0 text-xs text-red-400/70 hover:text-red-400 transition-colors"
                title="Verwijder tekst"
              >
                Verwijder
              </button>
            </div>
          )}
        </div>

        {/* Column 2 — Kamer Overview */}
        <div className="flex-[3] min-w-0 min-h-0 border-l border-dark-border bg-dark flex flex-col overflow-y-auto">

          <div className="flex shrink-0 items-center border-b border-dark-border px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
              Kamerkaart
            </span>
          </div>

          <div
            ref={previewWrapRef}
            className="w-full min-w-0 px-5 pt-3 pb-3 border-b border-dark-border shrink-0 flex justify-center"
          >
            <RoomPreviewCanvas
              edgePaddingPx={KAMER_OVERVIEW_EDGE_PADDING_PX}
              planSpanWidthCm={planSpanW}
              planSpanDepthCm={planSpanH}
              vertices={showingNewPreview ? previewVertices : (selectedRoom ? selectedRoom.vertices : previewVertices)}
              onChange={showingNewPreview
                ? applyPreviewFromCanvas
                : selectedRoom
                ? (verts) => blueprintStore.getState().updateRoomVertices(selectedRoom.id, verts)
                : applyPreviewFromCanvas
              }
              onDimensionChange={showingNewPreview || !selectedRoom
                ? (w, d) => {
                    pushPreviewHistory()
                    setPreviewWidth(w)
                    setPreviewDepth(d)
                  }
                : undefined
              }
              width={previewStageSize.w}
              height={previewStageSize.h}
              room={showingNewPreview ? null : selectedRoom}
              onToggleWallLock={!showingNewPreview && selectedRoom
                ? (wallIndex) => blueprintStore.getState().toggleWallLock(selectedRoom.id, wallIndex)
                : undefined
              }
              draftLockedWalls={showingNewPreview || !selectedRoom ? previewLockedWalls : undefined}
              onDraftToggleLock={showingNewPreview || !selectedRoom ? togglePreviewLock : undefined}
              selectedWallIndex={
                !showingNewPreview && selectedRoom
                  ? selectedWallIndex
                  : (previewVertices.length >= 3 ? selectedWallIndex : undefined)
              }
              onSelectWall={
                !showingNewPreview && selectedRoom
                  ? setSelectedWallIndex
                  : (previewVertices.length >= 3 ? setSelectedWallIndex : undefined)
              }
              hideWallDetailPanel={(!showingNewPreview && !!selectedRoom) || (previewVertices.length >= 3 && (showingNewPreview || !selectedRoom))}
              listHoverWallIndex={listHoverWallIndex}
              onHoverWall={setCanvasHoveredWallIndex}
            />
          </div>

          {showQuickKamerMaat && (
            <div className="px-5 pb-3 border-b border-dark-border shrink-0">
              <QuickKamerAfmetingenFields
                widthCm={previewWidth}
                depthCm={previewDepth}
                resetNonce={builderResetNonce}
                onApply={applyQuickKamerAfmetingen}
              />
            </div>
          )}

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

        </div>

        {/* Column 3 — Bouwer */}
        <div className="flex-[2] min-w-0 min-h-0 border-l border-dark-border overflow-y-auto">
          <BuilderPanel
            onPreviewChange={applyPreviewFromForm}
            onCanvasPreviewChange={applyPreviewFromCanvas}
            canvasPreviewEdited={canvasPreviewEdited}
            previewWidth={previewWidth}
            previewDepth={previewDepth}
            onWidthChange={setPreviewWidth}
            onDepthChange={setPreviewDepth}
            onActiveStepChange={setBuilderStep}
            parentPreviewVertices={previewVertices}
            selectedRoomId={selectedRoomId}
            builderResetNonce={builderResetNonce}
            onStartNewRoom={startNewRoom}
          />
        </div>

      </div>
    </EditorPage>
  )
}
