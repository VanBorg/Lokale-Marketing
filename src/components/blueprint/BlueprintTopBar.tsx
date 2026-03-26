import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { blueprintStore, useBlueprintStore } from '../../store/blueprintStore'
import EditorToolbar from './EditorToolbar'
import ShortcutsModal from './ShortcutsModal'
import { useBlueprintSave } from '../../hooks/useBlueprintSave'
import type { Project } from '../../lib/database.types'

interface BlueprintTopBarProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onTabChange: (tab: string) => void
}

export default function BlueprintTopBar({ project, onUpdateProject, onTabChange: _onTabChange }: BlueprintTopBarProps) {
  const navigate = useNavigate()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const { isSaving, lastSaved, isDirty, saveNow } = useBlueprintSave(project.id)

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

  const resetBlueprint = () => {
    const store = useBlueprintStore.getState()
    Object.keys(store.rooms).forEach(id => store.deleteRoom(id))
    blueprintStore.temporal.getState().clear()
  }

  return (
    <>
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
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </>
  )
}
