import { type ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { blueprintStore, useBlueprintStore } from '../store/blueprintStore'
import { useBlueprintSave } from '../hooks/useBlueprintSave'
import ShortcutsModal from '../components/blueprint/ShortcutsModal'
import EditorToolbar from './toolbar/EditorToolbar'
import type { Project } from '../lib/database.types'

interface EditorPageProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onTabChange: (tab: string) => void
  /** The main content area (3-column layout or just PixelCanvas) */
  children: ReactNode
}

/**
 * Full-page shell: renders the full-width EditorToolbar at the top,
 * then `children` fills the remaining height (the column layout).
 * Owning the toolbar here ensures it always spans 100% of the page width.
 */
export default function EditorPage({ project, onUpdateProject, children }: EditorPageProps) {
  const navigate = useNavigate()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const { isSaving, lastSaved, isDirty, saveNow, loadProject } = useBlueprintSave(project.id)

  useEffect(() => {
    blueprintStore.getState().initProject(project.id)
  }, [project.id])

  useEffect(() => {
    loadProject()
  }, [project.id, loadProject])

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

  const resetBlueprint = () => {
    const store = useBlueprintStore.getState()
    Object.keys(store.rooms).forEach(id => store.deleteRoom(id))
    blueprintStore.temporal.getState().clear()
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <EditorToolbar
        project={project}
        onUpdateProject={onUpdateProject}
        onBack={() => navigate('/projects')}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isSaving={isSaving}
        lastSaved={lastSaved}
        isDirty={isDirty}
        onSaveNow={saveNow}
        onResetBlueprint={resetBlueprint}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />
      {children}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}
