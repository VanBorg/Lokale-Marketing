import { useEffect } from 'react'
import { blueprintStore } from '../store/blueprintStore'

export function useBlueprintKeyboard() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (!el) return
      const tag = el.tagName
      // Don't fire shortcuts when typing in a field (focus blijft daar na klik op canvas niet meer nodig dankzij stage focus).
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (el.isContentEditable) return

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

      // Delete / Backspace — één temporal-stap (één undo/redo voor multi-select)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        blueprintStore.getState().deleteSelectionBulk()
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
