import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from 'zustand'
import { blueprintStore, useBlueprintStore } from '../store/blueprintStore'
import { useBlueprintSave } from '../hooks/useBlueprintSave'
import ShortcutsModal from '../components/blueprint/ShortcutsModal'
import EditorToolbar from './toolbar/EditorToolbar'
import type { Project } from '../lib/database.types'

/** Optioneel: plattegrond + kamerkaart-preview (BlueprintPage) — overschrijft alleen temporal undo/redo. */
export interface EditorPageUndoRedo {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

interface EditorPageProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onTabChange: (tab: string) => void
  /** The main content area (3-column layout or just PixelCanvas) */
  children: ReactNode
  /** Wanneer gezet (Blueprint), volgen undo/redo de kamerkaart-preview of de plattegrond. */
  undoRedo?: EditorPageUndoRedo
}

/**
 * Full-page shell: renders the full-width EditorToolbar at the top,
 * then `children` fills the remaining height (the column layout).
 * Owning the toolbar here ensures it always spans 100% of the page width.
 */
export default function EditorPage({ project, onUpdateProject, children, undoRedo }: EditorPageProps) {
  const navigate = useNavigate()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const canTemporalUndo = useStore(blueprintStore.temporal, s => s.pastStates.length > 0)
  const canTemporalRedo = useStore(blueprintStore.temporal, s => s.futureStates.length > 0)
  const {
    isSaving,
    lastSaved,
    isDirty,
    saveNow,
    loadProject,
    werkbladNotities,
    setWerkbladNotities,
  } = useBlueprintSave(project.id)

  const handleWerkbladNotitiesSave = useCallback(
    (text: string) => {
      setWerkbladNotities(text)
      void saveNow(text)
    },
    [setWerkbladNotities, saveNow],
  )

  useEffect(() => {
    blueprintStore.getState().initProject(project.id)
  }, [project.id])

  useEffect(() => {
    loadProject()
  }, [project.id, loadProject])

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

  const handleTemporalUndo = () => blueprintStore.temporal.getState().undo()
  const handleTemporalRedo = () => blueprintStore.temporal.getState().redo()

  const effectiveUndoRedo = undoRedo ?? {
    canUndo: canTemporalUndo,
    canRedo: canTemporalRedo,
    onUndo: handleTemporalUndo,
    onRedo: handleTemporalRedo,
  }

  const resetBlueprint = () => {
    const store = useBlueprintStore.getState()
    Object.keys(store.rooms).forEach(id => store.deleteRoom(id))
    blueprintStore.setState({
      canvasTextNotes: {},
      canvasTextNoteOrder: [],
      editingCanvasTextNoteId: null,
      selectedCanvasTextNoteIds: [],
      drawingStrokes: [],
      selectedDrawingStrokeIndices: [],
      measureLines: [],
      measureDraft: null,
      selectedMeasureLineIds: [],
      selectedIds: [],
      elements: {},
      activeTool: 'select',
      wallListExpandSeq: 0,
      wallListExpandRoomId: null,
    })
    blueprintStore.temporal.getState().clear()
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <EditorToolbar
        project={project}
        onUpdateProject={onUpdateProject}
        onBack={() => navigate('/projects')}
        canUndo={effectiveUndoRedo.canUndo}
        canRedo={effectiveUndoRedo.canRedo}
        onUndo={effectiveUndoRedo.onUndo}
        onRedo={effectiveUndoRedo.onRedo}
        isSaving={isSaving}
        lastSaved={lastSaved}
        isDirty={isDirty}
        onSaveNow={() => void saveNow()}
        werkbladNotities={werkbladNotities}
        onSaveWerkbladNotities={handleWerkbladNotitiesSave}
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
