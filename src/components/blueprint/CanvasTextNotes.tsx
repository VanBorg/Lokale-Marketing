import { Group, Rect, Text } from 'react-konva'
import { blueprintStore } from '../../store/blueprintStore'
import type { ActiveTool, CanvasTextNote } from '../../store/blueprintStore'

/** Tekstkolombreedte in wereld-eenheden (cm), zichtbaar als ~2,8 m op de plattegrond. */
export const CANVAS_TEXT_NOTE_WIDTH_CM = 280
const NOTE_WIDTH_CM = CANVAS_TEXT_NOTE_WIDTH_CM
const FONT_SCREEN_PX = 14
const PAD_SCREEN_PX = 8

interface CanvasTextNotesProps {
  noteOrder: string[]
  notes: Record<string, CanvasTextNote>
  viewportScale: number
  editingId: string | null
  selectedId: string | null
  isLight: boolean
  activeTool: ActiveTool
}

export default function CanvasTextNotes({
  noteOrder,
  notes,
  viewportScale,
  editingId,
  selectedId,
  isLight,
  activeTool,
}: CanvasTextNotesProps) {
  const fs = FONT_SCREEN_PX / viewportScale
  const pad = PAD_SCREEN_PX / viewportScale
  const w = NOTE_WIDTH_CM
  const fillBg = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(12,12,18,0.88)'
  const strokeIdle = isLight ? 'rgba(14,116,144,0.45)' : 'rgba(53,180,211,0.5)'
  const strokeSel = isLight ? '#0891b2' : '#35B4D3'
  const textFill = isLight ? '#0f172a' : '#e2e8f0'
  const placeholderFill = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(226,232,240,0.45)'

  return (
    <>
      {noteOrder.map(id => {
        const note = notes[id]
        if (!note) return null
        const isEditing = editingId === id
        const isSelected = selectedId === id
        const display = note.text.trim() ? note.text : 'Typ hier…'
        const lineCount = Math.max(1, display.split('\n').length)
        const minH = fs * lineCount + pad * 2 + fs * 0.35

        const handlePointerPick = () => {
          const store = blueprintStore.getState()
          if (activeTool === 'write') {
            store.openCanvasTextNoteEditor(id)
          } else {
            store.selectCanvasTextNote(id)
          }
        }

        return (
          <Group
            key={id}
            x={note.x}
            y={note.y}
            onMouseDown={e => {
              e.cancelBubble = true
              e.evt.stopPropagation()
              handlePointerPick()
            }}
            onTap={e => {
              e.cancelBubble = true
              e.evt.stopPropagation()
              handlePointerPick()
            }}
            onClick={e => {
              e.cancelBubble = true
              e.evt.stopPropagation()
            }}
            onDblClick={e => {
              e.cancelBubble = true
              e.evt.stopPropagation()
              blueprintStore.getState().openCanvasTextNoteEditor(id)
            }}
            onDblTap={e => {
              e.cancelBubble = true
              e.evt.stopPropagation()
              blueprintStore.getState().openCanvasTextNoteEditor(id)
            }}
          >
            <Rect
              width={w}
              height={minH}
              fill={fillBg}
              stroke={isSelected ? strokeSel : strokeIdle}
              strokeWidth={(isSelected ? 2 : 1) / viewportScale}
              cornerRadius={4 / viewportScale}
              shadowColor={isSelected ? '#35B4D3' : undefined}
              shadowBlur={isSelected ? 8 / viewportScale : 0}
              shadowOpacity={0.25}
            />
            {!isEditing && (
              <Text
                x={pad}
                y={pad}
                width={w - pad * 2}
                text={display}
                fontSize={fs}
                fontFamily="system-ui,Segoe UI,sans-serif"
                fill={note.text.trim() ? textFill : placeholderFill}
                lineHeight={1.25}
                wrap="word"
              />
            )}
          </Group>
        )
      })}
    </>
  )
}
