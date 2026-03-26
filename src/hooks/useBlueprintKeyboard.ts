import { useEffect } from 'react'
import { blueprintStore } from '../store/blueprintStore'

export function useBlueprintKeyboard() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      // Don't fire shortcuts when typing in an input/textarea
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const store = blueprintStore.getState()
      const temporal = blueprintStore.temporal.getState()

      // Undo
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        temporal.undo()
        return
      }

      // Redo
      if (
        (e.ctrlKey && e.key === 'y') ||
        (e.ctrlKey && e.shiftKey && e.key === 'z') ||
        (e.ctrlKey && e.shiftKey && e.key === 'Z')
      ) {
        e.preventDefault()
        temporal.redo()
        return
      }

      // Escape — deselect / cancel
      if (e.key === 'Escape') {
        store.clearSelection()
        store.cancelDrawing()
        store.clearMeasureDraft()
        return
      }

      // Delete / Backspace — remove selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedNoteId = store.selectedCanvasTextNoteId
        if (selectedNoteId && !store.editingCanvasTextNoteId) {
          store.deleteCanvasTextNote(selectedNoteId)
          return
        }
        const measureId = store.selectedMeasureLineId
        if (measureId) {
          store.deleteMeasureLine(measureId)
          return
        }
        const strokeIdx = store.selectedDrawingStrokeIndex
        if (
          strokeIdx !== null &&
          strokeIdx < store.drawingStrokes.length &&
          store.drawingStrokes[strokeIdx]?.length
        ) {
          store.deleteDrawingStrokeAt(strokeIdx)
          return
        }
        const { selectedIds } = store
        for (const id of selectedIds) {
          if (store.rooms[id]) {
            store.deleteRoom(id)
          } else if (store.elements[id]) {
            store.deleteElement(id)
          }
        }
        store.clearSelection()
        return
      }

      // Zoom — 10% per stap (zelfde als toolbar / muiswiel)
      if (e.key === '+' || e.key === '=') {
        store.zoomViewportByPercentDelta(10)
        return
      }

      if (e.key === '-') {
        store.zoomViewportByPercentDelta(-10)
        return
      }

      // S — same as recenterViewportToOrigin (canvasSize from store)
      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          store.recenterViewportToOrigin()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
