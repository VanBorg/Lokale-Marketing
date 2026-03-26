import type {
  CanvasTextNote,
  MeasureLineEntity,
  Point,
  Room,
} from '../../store/blueprintStore'
import {
  axisAlignedRectFromCorners,
  rectsIntersect,
  roomAxisAlignedBounds,
  type AxisAlignedRect,
} from '../../utils/blueprintGeometry'
import { CANVAS_TEXT_NOTE_WIDTH_CM } from '../../components/blueprint/CanvasTextNotes'

const FONT_SCREEN_PX = 14
const PAD_SCREEN_PX = 8

/** Zelfde hoogte-logica als CanvasTextNotes (wereld-cm). */
export function canvasTextNoteBoundsInWorld(
  note: CanvasTextNote,
  viewportScale: number,
): AxisAlignedRect {
  const vs = Math.max(viewportScale, 1e-6)
  const fs = FONT_SCREEN_PX / vs
  const pad = PAD_SCREEN_PX / vs
  const w = CANVAS_TEXT_NOTE_WIDTH_CM
  const display = note.text.trim() ? note.text : 'Typ hier…'
  const lineCount = Math.max(1, display.split('\n').length)
  const minH = fs * lineCount + pad * 2 + fs * 0.35
  return {
    minX: note.x,
    minY: note.y,
    maxX: note.x + w,
    maxY: note.y + minH,
  }
}

function strokeBounds(stroke: Point[]): AxisAlignedRect | null {
  return roomAxisAlignedBounds(stroke)
}

function measureLineBounds(line: MeasureLineEntity): AxisAlignedRect {
  return axisAlignedRectFromCorners(line.start, line.end)
}

export function collectMarqueeHits(
  rect: AxisAlignedRect,
  opts: {
    roomOrder: string[]
    rooms: Record<string, Room>
    canvasTextNoteOrder: string[]
    canvasTextNotes: Record<string, CanvasTextNote>
    drawingStrokes: Point[][]
    measureLines: MeasureLineEntity[]
    viewportScale: number,
  },
): {
  roomIds: string[]
  noteIds: string[]
  strokeIndices: number[]
  measureLineIds: string[]
} {
  const roomIds: string[] = []
  for (const rid of opts.roomOrder) {
    const room = opts.rooms[rid]
    if (!room) continue
    const b = roomAxisAlignedBounds(room.vertices)
    if (b && rectsIntersect(rect, b)) roomIds.push(rid)
  }

  const noteIds: string[] = []
  for (const id of opts.canvasTextNoteOrder) {
    const note = opts.canvasTextNotes[id]
    if (!note) continue
    const b = canvasTextNoteBoundsInWorld(note, opts.viewportScale)
    if (rectsIntersect(rect, b)) noteIds.push(id)
  }

  const strokeIndices: number[] = []
  opts.drawingStrokes.forEach((stroke, si) => {
    if (stroke.length < 2) return
    const b = strokeBounds(stroke)
    if (b && rectsIntersect(rect, b)) strokeIndices.push(si)
  })

  const measureLineIds: string[] = []
  for (const line of opts.measureLines) {
    const b = measureLineBounds(line)
    if (rectsIntersect(rect, b)) measureLineIds.push(line.id)
  }

  return { roomIds, noteIds, strokeIndices, measureLineIds }
}
