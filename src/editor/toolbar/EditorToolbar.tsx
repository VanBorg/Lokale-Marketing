import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Clipboard,
  Grid3x3,
  Magnet,
  Minus,
  MoreVertical,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Ruler,
  Undo2,
} from 'lucide-react'
import ProjectStatusSelect from '../../components/project/ProjectStatusSelect'
import { Button } from '../../components/ui'
import KlantgegevensModal from '../../components/blueprint/KlantgegevensModal'
import type { Project } from '../../lib/database.types'
import {
  blueprintStore,
  getDefaultBlueprintScaleForCanvasHeight,
  useBlueprintStore,
  useViewport,
} from '../../store/blueprintStore'
import { useToolbarState } from './useToolbarState'

function ToolbarDivider() {
  return (
    <div
      className="h-5 w-px shrink-0 bg-neutral-700/60 theme-light:bg-neutral-200"
      aria-hidden
    />
  )
}

export interface EditorToolbarProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onBack: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  isSaving: boolean
  lastSaved: Date | null
  isDirty: boolean
  onSaveNow: () => void
  onResetBlueprint: () => void
  onOpenShortcuts: () => void
}

export default function EditorToolbar({
  project,
  onUpdateProject,
  onBack,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isSaving,
  lastSaved,
  isDirty,
  onSaveNow,
  onResetBlueprint,
  onOpenShortcuts,
}: EditorToolbarProps) {
  const [showKlant, setShowKlant] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  const [nameDraft, setNameDraft] = useState(project.name)
  const [nameEditing, setNameEditing] = useState(false)
  useEffect(() => {
    setNameDraft(project.name)
  }, [project.name])

  const commitName = useCallback(() => {
    const next = nameDraft.trim()
    if (next && next !== project.name) onUpdateProject({ name: next })
    else if (!next) setNameDraft(project.name)
    setNameEditing(false)
  }, [nameDraft, project.name, onUpdateProject])

  const { activeTool, snapEnabled, gridEnabled, setActiveTool, setSnapEnabled, setGridEnabled } =
    useToolbarState()

  const viewport = useViewport()
  const canvasSize = useBlueprintStore(s => s.canvasSize)
  const baseScale = getDefaultBlueprintScaleForCanvasHeight(Math.max(canvasSize.height, 1))
  const zoomPercentLabel = Math.max(1, Math.round((viewport.scale / baseScale) * 100))

  const onZoomOut = useCallback(() => {
    blueprintStore.getState().zoomViewportAtCenter('out')
  }, [])
  const onZoomIn = useCallback(() => {
    blueprintStore.getState().zoomViewportAtCenter('in')
  }, [])
  const onZoomReset = useCallback(() => {
    blueprintStore.getState().recenterViewportToOrigin()
  }, [])

  const setCanvasTool = useCallback(
    (tool: 'select' | 'draw' | 'measure') => {
      setActiveTool(tool)
    },
    [setActiveTool],
  )

  const onExport = useCallback(() => {
    setOverflowOpen(false)
  }, [])

  const onSettings = useCallback(() => {
    setOverflowOpen(false)
  }, [])

  const onResetFromMenu = useCallback(() => {
    setOverflowOpen(false)
    if (
      window.confirm(
        'Weet je zeker dat je opnieuw wilt beginnen? Alle kamers worden verwijderd.',
      )
    ) {
      onResetBlueprint()
    }
  }, [onResetBlueprint])

  useEffect(() => {
    if (!overflowOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = overflowRef.current
      if (el && !el.contains(e.target as Node)) setOverflowOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [overflowOpen])

  const copySavedTime = useCallback(() => {
    if (!lastSaved) return
    const text = `Opgeslagen ${lastSaved.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
    void navigator.clipboard?.writeText(text)
  }, [lastSaved])

  const toolSegmentIndex =
    activeTool === 'select' ? 0 : activeTool === 'draw' ? 1 : 2

  const segmentToolBtn = (active: boolean) =>
    [
      'relative z-10 flex min-w-0 flex-1 items-center justify-center rounded-none px-2',
      'transition-colors duration-200 ease-out',
      'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-0',
      active
        ? 'text-white'
        : 'text-neutral-400 hover:text-neutral-100 theme-light:text-neutral-600 theme-light:hover:text-neutral-900',
    ].join(' ')

  const toolBtn = segmentToolBtn

  const toggleBtn = (on: boolean) =>
    [
      'editor-toolbar-icon-btn shrink-0 transition-all duration-200',
      on ? 'bg-accent/15 text-accent ring-1 ring-accent/40' : 'opacity-80 theme-light:opacity-100',
    ].join(' ')

  return (
    <>
      <div className="editor-toolbar-bar flex h-12 shrink-0 items-center gap-1.5 border-b border-neutral-800 bg-neutral-950 px-3 theme-light:border-neutral-200 theme-light:bg-white">
        {/* Groep 1 — project-identiteit */}
        <button
          type="button"
          onClick={onBack}
          className="editor-toolbar-icon-btn shrink-0"
          title="Terug naar projecten"
          aria-label="Terug naar projecten"
        >
          <ArrowLeft size={15} />
        </button>

        <div className="flex min-w-0 max-w-[min(100%,20rem)] shrink items-center gap-2">
          {nameEditing ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') {
                  setNameDraft(project.name)
                  setNameEditing(false)
                }
              }}
              className="min-w-0 max-w-full rounded border border-accent/50 bg-dark-card px-2 py-0.5 text-sm font-bold text-light outline-none focus:border-accent theme-light:bg-white theme-light:text-neutral-900"
              aria-label="Projectnaam"
            />
          ) : (
            <button
              type="button"
              onClick={() => setNameEditing(true)}
              className="min-w-0 truncate text-left text-sm font-bold text-neutral-100 transition-colors hover:text-accent theme-light:text-neutral-900 theme-light:hover:text-accent"
              title="Projectnaam bewerken"
            >
              {project.name}
            </button>
          )}
          <ProjectStatusSelect
            size="sm"
            value={project.status}
            onChange={status => onUpdateProject({ status })}
            id="project-status-editor-toolbar"
          />
        </div>

        <ToolbarDivider />

        {/* Groep 2 — edit-acties */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="editor-toolbar-icon-btn disabled:cursor-not-allowed disabled:opacity-30"
          title="Ongedaan maken (Ctrl+Z)"
          aria-label="Ongedaan maken"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="editor-toolbar-icon-btn disabled:cursor-not-allowed disabled:opacity-30"
          title="Opnieuw (Ctrl+Y)"
          aria-label="Opnieuw uitvoeren"
        >
          <Redo2 size={15} />
        </button>

        <ToolbarDivider />

        {/* Groep 3 — canvas-controls */}
        <button
          type="button"
          onClick={onZoomOut}
          className="editor-toolbar-icon-btn shrink-0"
          title="Uitzoomen (−10%)"
          aria-label="Uitzoomen"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className="min-w-[3rem] shrink-0 rounded-lg px-2 py-1 text-center text-xs font-medium tabular-nums text-neutral-300 transition-colors duration-200 hover:bg-neutral-800 hover:text-neutral-100 theme-light:text-neutral-700 theme-light:hover:bg-neutral-100 theme-light:hover:text-neutral-900"
          title="100% — standaardzoom (centreer op oorsprong, zelfde als S)"
        >
          {zoomPercentLabel}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="editor-toolbar-icon-btn shrink-0"
          title="Inzoomen (+10%)"
          aria-label="Inzoomen"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={toggleBtn(snapEnabled)}
          title={snapEnabled ? 'Snap uit' : 'Snap aan'}
          aria-label="Snap"
          aria-pressed={snapEnabled}
        >
          <Magnet size={15} />
        </button>
        <button
          type="button"
          onClick={() => setGridEnabled(!gridEnabled)}
          className={toggleBtn(gridEnabled)}
          title={gridEnabled ? 'Raster uit' : 'Raster aan'}
          aria-label="Raster"
          aria-pressed={gridEnabled}
        >
          <Grid3x3 size={15} />
        </button>

        <ToolbarDivider />

        {/* Groep 4 — canvas-tools: één groep met dunne rand; zachte vulling op selectie */}
        <div
          className="relative flex h-8 min-w-[6.75rem] shrink-0 items-stretch overflow-hidden rounded-lg border border-neutral-600/85 bg-neutral-900/45 theme-light:border-neutral-300 theme-light:bg-neutral-100/95"
          role="group"
          aria-label="Canvas-gereedschap"
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 rounded-none bg-accent/40 transition-transform duration-200 ease-out theme-light:bg-accent/45"
            style={{
              width: 'calc(100% / 3)',
              transform: `translateX(${toolSegmentIndex * 100}%)`,
            }}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => setCanvasTool('select')}
            className={`${segmentToolBtn(activeTool === 'select')} border-r border-neutral-700/45 theme-light:border-neutral-200`}
            title="Selectie"
            aria-label="Selectie"
            aria-pressed={activeTool === 'select'}
          >
            <MousePointer2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setCanvasTool('draw')}
            className={`${segmentToolBtn(activeTool === 'draw')} border-r border-neutral-700/45 theme-light:border-neutral-200`}
            title="Tekenen"
            aria-label="Tekenen"
            aria-pressed={activeTool === 'draw'}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => setCanvasTool('measure')}
            className={segmentToolBtn(activeTool === 'measure')}
            title="Meten"
            aria-label="Meten"
            aria-pressed={activeTool === 'measure'}
          >
            <Ruler size={15} />
          </button>
        </div>

        {/* Midden — spacer */}
        <div className="min-w-4 flex-1" aria-hidden />

        {/* Groep 5 — opslagstatus */}
        <div className="flex shrink-0 items-center gap-2">
          {isDirty && !isSaving && (
            <span className="text-[10px] text-neutral-500 theme-light:text-neutral-500">
              Niet opgeslagen
            </span>
          )}
          {lastSaved && !isDirty && (
            <span className="text-[10px] text-neutral-500 theme-light:text-neutral-500">
              Opgeslagen{' '}
              {lastSaved.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {isSaving && (
            <span className="text-[10px] text-neutral-500 theme-light:text-neutral-500">
              Bezig met opslaan…
            </span>
          )}
          <button
            type="button"
            onClick={onSaveNow}
            disabled={isSaving || !isDirty}
            className="editor-toolbar-icon-btn disabled:cursor-not-allowed disabled:opacity-30"
            title="Opslaan (Ctrl+S)"
            aria-label="Opslaan"
          >
            {isSaving ? (
              <div className="h-3 w-3 animate-spin rounded-full border border-accent border-t-transparent" />
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={copySavedTime}
            disabled={!lastSaved}
            className="editor-toolbar-icon-btn disabled:cursor-not-allowed disabled:opacity-30"
            title="Kopieer opslagtijd"
            aria-label="Kopieer opslagtijd"
          >
            <Clipboard size={14} />
          </button>
        </div>

        <ToolbarDivider />

        {/* Groep 6 — klant */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKlant(true)}
          className="shrink-0 gap-1.5 text-xs text-neutral-300 hover:text-neutral-100 theme-light:text-neutral-700 theme-light:hover:text-neutral-900 theme-light:hover:bg-neutral-100"
          title="Klantgegevens"
        >
          <span aria-hidden>👤</span>
          Klantgegevens
        </Button>

        <ToolbarDivider />

        {/* Groep 7 — overflow */}
        <div className="relative shrink-0" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setOverflowOpen(o => !o)}
            className="editor-toolbar-icon-btn"
            title="Meer opties"
            aria-label="Meer opties"
            aria-expanded={overflowOpen}
            aria-haspopup="menu"
          >
            <MoreVertical size={15} />
          </button>
          {overflowOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-neutral-800 bg-neutral-950 py-1 shadow-lg theme-light:border-neutral-200 theme-light:bg-white"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm text-neutral-200 transition-colors duration-200 hover:bg-neutral-900 hover:text-neutral-100 theme-light:text-neutral-800 theme-light:hover:bg-neutral-100 theme-light:hover:text-neutral-900"
                onClick={onExport}
              >
                Exporteren
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm text-neutral-200 transition-colors duration-200 hover:bg-neutral-900 hover:text-neutral-100 theme-light:text-neutral-800 theme-light:hover:bg-neutral-100 theme-light:hover:text-neutral-900"
                onClick={onSettings}
              >
                Instellingen
              </button>
              <div className="my-1 h-px bg-neutral-800 theme-light:bg-neutral-200" />
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm text-red-400 transition-colors duration-200 hover:bg-red-500/10"
                onClick={onResetFromMenu}
              >
                Opnieuw beginnen
              </button>
            </div>
          )}
        </div>

        {/* Groep 8 — help */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-neutral-400 transition-all duration-200 hover:bg-neutral-800 hover:text-neutral-100 theme-light:text-neutral-600 theme-light:hover:bg-neutral-100 theme-light:hover:text-neutral-900"
          title="Sneltoetsen"
          aria-label="Sneltoetsen tonen"
        >
          ?
        </button>
      </div>

      {showKlant && (
        <KlantgegevensModal
          project={project}
          onSave={onUpdateProject}
          onClose={() => setShowKlant(false)}
        />
      )}
    </>
  )
}
