import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import ProjectStatusSelect from '../project/ProjectStatusSelect'
import { Button } from '../ui'
import KlantgegevensModal from './KlantgegevensModal'
import type { Project } from '../../lib/database.types'
import {
  blueprintStore,
  getDefaultBlueprintScaleForCanvasHeight,
  useActiveTool,
  useBlueprintStore,
  useViewport,
} from '../../store/blueprintStore'

function ToolbarDivider() {
  return <div className="h-5 w-px shrink-0 bg-light/[0.08]" aria-hidden />
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

  /** Placeholder — nog niet gekoppeld aan snap/raster op de canvas */
  const [snapOn, setSnapOn] = useState(true)
  const [gridOn, setGridOn] = useState(false)
  /** Meet-tool is alleen UI; canvas blijft op select */
  const [measureMode, setMeasureMode] = useState(false)

  const viewport = useViewport()
  const canvasSize = useBlueprintStore(s => s.canvasSize)
  const storeTool = useActiveTool()
  const baseScale = useMemo(
    () => getDefaultBlueprintScaleForCanvasHeight(Math.max(canvasSize.height, 1)),
    [canvasSize.height],
  )
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

  const setCanvasTool = useCallback((tool: 'select' | 'draw' | 'measure') => {
    if (tool === 'measure') {
      setMeasureMode(true)
      blueprintStore.getState().setActiveTool('select')
      return
    }
    setMeasureMode(false)
    blueprintStore.getState().setActiveTool(tool === 'draw' ? 'draw' : 'select')
  }, [])

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

  const toolBtn = (active: boolean) =>
    [
      'ui-icon-button shrink-0 transition-all duration-200',
      active
        ? 'bg-accent/15 text-accent ring-1 ring-accent/40 hover:bg-accent/20 hover:text-accent'
        : '',
    ].join(' ')

  const toggleBtn = (on: boolean) =>
    [
      'ui-icon-button shrink-0 transition-all duration-200',
      on ? 'bg-accent/15 text-accent ring-1 ring-accent/40' : 'opacity-80',
    ].join(' ')

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-dark-border bg-[#0f0f0f] px-3">
        {/* Groep 1 — project-identiteit */}
        <button
          type="button"
          onClick={onBack}
          className="ui-icon-button shrink-0"
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
              className="min-w-0 max-w-full rounded border border-accent/50 bg-dark-card px-2 py-0.5 text-sm font-bold text-light outline-none focus:border-accent"
              aria-label="Projectnaam"
            />
          ) : (
            <button
              type="button"
              onClick={() => setNameEditing(true)}
              className="min-w-0 truncate text-left text-sm font-bold text-light transition-colors hover:text-accent"
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
          className="ui-icon-button disabled:cursor-not-allowed disabled:opacity-30"
          title="Ongedaan maken (Ctrl+Z)"
          aria-label="Ongedaan maken"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="ui-icon-button disabled:cursor-not-allowed disabled:opacity-30"
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
          className="ui-icon-button shrink-0"
          title="Uitzoomen (−10%)"
          aria-label="Uitzoomen"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className="min-w-[3rem] shrink-0 rounded-lg px-2 py-1 text-center text-xs font-medium tabular-nums text-light/80 transition-colors duration-200 hover:bg-dark-card hover:text-light"
          title="100% — standaardzoom (centreer op oorsprong, zelfde als S)"
        >
          {zoomPercentLabel}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="ui-icon-button shrink-0"
          title="Inzoomen (+10%)"
          aria-label="Inzoomen"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={() => setSnapOn(s => !s)}
          className={toggleBtn(snapOn)}
          title={snapOn ? 'Snap uit' : 'Snap aan'}
          aria-label="Snap"
          aria-pressed={snapOn}
        >
          <Magnet size={15} />
        </button>
        <button
          type="button"
          onClick={() => setGridOn(g => !g)}
          className={toggleBtn(gridOn)}
          title={gridOn ? 'Raster uit' : 'Raster aan'}
          aria-label="Raster"
          aria-pressed={gridOn}
        >
          <Grid3x3 size={15} />
        </button>

        <ToolbarDivider />

        {/* Groep 4 — canvas-tools */}
        <button
          type="button"
          onClick={() => setCanvasTool('select')}
          className={toolBtn(storeTool === 'select' && !measureMode)}
          title="Selectie"
          aria-label="Selectie"
          aria-pressed={storeTool === 'select' && !measureMode}
        >
          <MousePointer2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => setCanvasTool('draw')}
          className={toolBtn(storeTool === 'draw')}
          title="Tekenen"
          aria-label="Tekenen"
          aria-pressed={storeTool === 'draw'}
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={() => setCanvasTool('measure')}
          className={toolBtn(measureMode)}
          title="Meten (binnenkort)"
          aria-label="Meten"
          aria-pressed={measureMode}
        >
          <Ruler size={15} />
        </button>

        {/* Midden — spacer */}
        <div className="min-w-4 flex-1" aria-hidden />

        {/* Groep 5 — opslagstatus */}
        <div className="flex shrink-0 items-center gap-2">
          {isDirty && !isSaving && (
            <span className="text-[10px] text-light/40">Niet opgeslagen</span>
          )}
          {lastSaved && !isDirty && (
            <span className="text-[10px] text-light/30">
              Opgeslagen{' '}
              {lastSaved.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {isSaving && (
            <span className="text-[10px] text-light/40">Bezig met opslaan…</span>
          )}
          <button
            type="button"
            onClick={onSaveNow}
            disabled={isSaving || !isDirty}
            className="ui-icon-button disabled:cursor-not-allowed disabled:opacity-30"
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
            className="ui-icon-button disabled:cursor-not-allowed disabled:opacity-30"
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
          className="shrink-0 gap-1.5 text-xs"
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
            className="ui-icon-button"
            title="Meer opties"
            aria-label="Meer opties"
            aria-expanded={overflowOpen}
            aria-haspopup="menu"
          >
            <MoreVertical size={15} />
          </button>
          {overflowOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-dark-border bg-dark-card py-1 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm text-light/90 transition-colors duration-200 hover:bg-dark hover:text-light"
                onClick={onExport}
              >
                Exporteren
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm text-light/90 transition-colors duration-200 hover:bg-dark hover:text-light"
                onClick={onSettings}
              >
                Instellingen
              </button>
              <div className="my-1 h-px bg-dark-border" />
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-light/50 transition-all duration-200 hover:bg-dark-card hover:text-light"
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
