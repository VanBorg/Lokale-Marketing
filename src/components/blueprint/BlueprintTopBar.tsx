import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Undo2, Redo2, RotateCcw, User, HelpCircle, ArrowLeft } from 'lucide-react'
import { useBlueprintStore, blueprintStore } from '../../store/blueprintStore'
import { Button } from '../ui'
import KlantgegevensModal from './KlantgegevensModal'
import ShortcutsModal from './ShortcutsModal'
import ProjectStatusSelect from '../project/ProjectStatusSelect'
import { useBlueprintSave } from '../../hooks/useBlueprintSave'
import type { Project } from '../../lib/database.types'

interface BlueprintTopBarProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onTabChange: (tab: string) => void
}

export default function BlueprintTopBar({ project, onUpdateProject, onTabChange: _onTabChange }: BlueprintTopBarProps) {
  const navigate = useNavigate()
  const [showKlant, setShowKlant] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const { isSaving, lastSaved, isDirty, saveNow } = useBlueprintSave(project.id)

  // Manual subscription to the zundo temporal store.
  // useStore(temporal, selector) can trigger sync re-render loops during
  // React's commit phase; a useEffect subscription avoids this entirely.
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    const sync = () => {
      const t = blueprintStore.temporal.getState()
      setCanUndo(t.pastStates.length > 0)
      setCanRedo(t.futureStates.length > 0)
    }
    sync()
    return blueprintStore.temporal.subscribe(sync)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        saveNow()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveNow])

  const handleUndo = () => blueprintStore.temporal.getState().undo()
  const handleRedo = () => blueprintStore.temporal.getState().redo()

  const handleReset = () => {
    if (window.confirm('Weet je zeker dat je opnieuw wilt beginnen? Alle kamers worden verwijderd.')) {
      const store = useBlueprintStore.getState()
      Object.keys(store.rooms).forEach(id => store.deleteRoom(id))
      blueprintStore.temporal.getState().clear()
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 px-3 h-12 border-b border-dark-border bg-dark shrink-0">
        {/* Back to projects list — consistent with "← Projecten" in the side panel */}
        <button
          onClick={() => navigate('/projects')}
          className="ui-icon-button mr-1 shrink-0"
          title="Terug naar projecten"
          aria-label="Terug naar projecten"
        >
          <ArrowLeft size={15} />
        </button>

        {/* Project name + status (dropdown direct naast de naam) */}
        <div className="flex min-w-0 max-w-[min(100%,24rem)] shrink items-center gap-2">
          <span className="min-w-0 truncate text-sm font-bold text-light">{project.name}</span>
          <ProjectStatusSelect
            size="sm"
            value={project.status}
            onChange={status => onUpdateProject({ status })}
            id="project-status-topbar"
          />
        </div>

        <div className="flex-1" />

        {/* Undo / Redo — editing sneltoetsen grouped first */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="ui-icon-button disabled:opacity-30 disabled:cursor-not-allowed"
          title="Ongedaan maken (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className="ui-icon-button disabled:opacity-30 disabled:cursor-not-allowed"
          title="Opnieuw uitvoeren (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={15} />
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-dark-border mx-1 shrink-0" />

        {/* Opslaan status */}
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && !isSaving && (
            <span className="text-[10px] text-light/40">Niet opgeslagen</span>
          )}
          {lastSaved && !isDirty && (
            <span className="text-[10px] text-light/30">
              Opgeslagen {lastSaved.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={saveNow}
            disabled={isSaving || !isDirty}
            className="ui-icon-button disabled:opacity-30 disabled:cursor-not-allowed text-xs px-2 flex items-center gap-1"
            title="Opslaan (Ctrl+S)"
          >
            {isSaving ? (
              <div className="h-3 w-3 rounded-full border border-accent border-t-transparent animate-spin" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            )}
          </button>
        </div>

        {/* Klantgegevens — project info */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKlant(true)}
          className="gap-1.5 text-xs shrink-0"
        >
          <User size={13} />
          Klantgegevens
        </Button>

        {/* Opnieuw beginnen — destructive, last before help */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="gap-1.5 text-xs text-light/60 hover:text-light shrink-0"
        >
          <RotateCcw size={13} />
          Opnieuw beginnen
        </Button>

        {/* Separator */}
        <div className="w-px h-5 bg-dark-border mx-1 shrink-0" />

        {/* Shortcuts help */}
        <button
          onClick={() => setShowShortcuts(true)}
          className="ui-icon-button"
          title="Sneltoetsen"
          aria-label="Sneltoetsen tonen"
        >
          <HelpCircle size={15} />
        </button>
      </div>

      {showKlant && (
        <KlantgegevensModal
          project={project}
          onSave={onUpdateProject}
          onClose={() => setShowKlant(false)}
        />
      )}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </>
  )
}
