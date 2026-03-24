import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Undo2, Redo2, RotateCcw, User, HelpCircle, ArrowLeft } from 'lucide-react'
import { useBlueprintStore, blueprintStore } from '../../store/blueprintStore'
import { Button } from '../ui'
import KlantgegevensModal from './KlantgegevensModal'
import ShortcutsModal from './ShortcutsModal'
import ProjectStatusSelect from '../project/ProjectStatusSelect'
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

        {/* Klantgegevens */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKlant(true)}
          className="gap-1.5 text-xs shrink-0"
        >
          <User size={13} />
          Klantgegevens
        </Button>

        {/* Opnieuw beginnen */}
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

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="ui-icon-button disabled:opacity-30 disabled:cursor-not-allowed"
          title="Ongedaan maken (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>

        {/* Redo */}
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
