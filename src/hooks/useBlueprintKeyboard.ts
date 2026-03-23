import { useEffect } from 'react'
import { blueprintStore } from '../store/blueprintStore'

const ZOOM_STEP = 0.1
const MIN_SCALE = 0.1
const MAX_SCALE = 5

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
        return
      }

      // Delete / Backspace — remove selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
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

      // Zoom in
      if (e.key === '+' || e.key === '=') {
        const { viewport } = store
        store.setViewport({ scale: Math.min(MAX_SCALE, viewport.scale + ZOOM_STEP) })
        return
      }

      // Zoom out
      if (e.key === '-') {
        const { viewport } = store
        store.setViewport({ scale: Math.max(MIN_SCALE, viewport.scale - ZOOM_STEP) })
        return
      }

      // S — snap viewport back to world origin (0,0) at scale 1
      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          store.setViewport({ x: 0, y: 0, scale: 1 })
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
