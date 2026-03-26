import { useLayoutEffect, useRef } from 'react'
import { blueprintStore } from '../../store/blueprintStore'
import type { CanvasTextNote, Viewport } from '../../store/blueprintStore'
import { CANVAS_TEXT_NOTE_WIDTH_CM } from '../../components/blueprint/CanvasTextNotes'

interface CanvasTextNoteEditorOverlayProps {
  editingId: string | null
  note: CanvasTextNote | undefined
  viewport: Viewport
}

export default function CanvasTextNoteEditorOverlay({
  editingId,
  note,
  viewport,
}: CanvasTextNoteEditorOverlayProps) {
  const textareaEditRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    if (editingId) textareaEditRef.current?.focus()
  }, [editingId])

  if (!editingId || !note) return null

  const leftPx = note.x * viewport.scale + viewport.x
  const topPx = note.y * viewport.scale + viewport.y
  const wPx = CANVAS_TEXT_NOTE_WIDTH_CM * viewport.scale

  return (
    <textarea
      ref={textareaEditRef}
      className="pointer-events-auto absolute z-20 min-h-[4.5rem] resize-y rounded border border-accent/50 bg-neutral-950/95 p-2 text-sm text-neutral-100 shadow-lg outline-none transition-all duration-200 placeholder:text-neutral-500 focus:ring-2 focus:ring-accent/45 theme-light:border-neutral-300 theme-light:bg-white theme-light:text-neutral-900 theme-light:placeholder:text-neutral-400"
      style={{ left: leftPx, top: topPx, width: wPx, maxWidth: 'min(100%, 24rem)' }}
      value={note.text}
      placeholder="Typ hier…"
      aria-label="Tekst op plattegrond"
      onChange={e => {
        blueprintStore.getState().updateCanvasTextNote(editingId, { text: e.target.value })
      }}
      onBlur={() => blueprintStore.getState().setEditingCanvasTextNoteId(null)}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          blueprintStore.getState().setEditingCanvasTextNoteId(null)
        }
      }}
    />
  )
}
