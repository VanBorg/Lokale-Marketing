import { nanoid } from 'nanoid'
import type { BlueprintDoc, Room } from '../store/blueprintStore'
import { axisAlignedBBoxSize, generateShapeVertices, type RoomShapeStored } from './blueprintGeometry'
import { DEFAULT_ROOM_WALL_HEIGHT_CM } from '../components/blueprint/roomStructureHelpers'

const DEFAULT_FILL = 'rgba(53,180,211,0.08)'

/** Deterministic hash so each project gets a stable but distinct shape/size. */
function hashProjectId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const SHAPES: RoomShapeStored[] = [
  'rechthoek',
  'l-vorm',
  't-vorm',
  'u-vorm',
  'i-vorm',
  'plus-vorm',
]

/** Realistic room spans (cm); combined with `hashProjectId` for variety across projects. */
const WIDTHS_CM = [420, 520, 600, 680, 750, 480, 840, 560, 640, 700]
const DEPTHS_CM = [380, 450, 520, 600, 420, 640, 500, 580, 480, 660]

export function isBlueprintDocWithoutRooms(doc: BlueprintDoc): boolean {
  if (doc.roomOrder.length === 0) return true
  return Object.keys(doc.rooms).length === 0
}

/**
 * One starter room per project: varied preset shape and dimensions, centred on the origin.
 * No floor-plan elements (deuren/ramen/etc.); `elements` stays empty in the returned doc.
 */
export function buildDefaultStarterBlueprintDoc(projectId: string): {
  doc: BlueprintDoc
  defaultRoomId: string
} {
  const seed = hashProjectId(projectId)
  const shape = SHAPES[seed % SHAPES.length]
  const w = WIDTHS_CM[(seed >> 3) % WIDTHS_CM.length]
  const d = DEPTHS_CM[(seed >> 7) % DEPTHS_CM.length]
  const vertices = generateShapeVertices(shape, w, d)
  const bbox = axisAlignedBBoxSize(vertices)
  const defaultRoomId = nanoid()

  const room: Room = {
    id: defaultRoomId,
    name: 'Ruimte',
    vertices,
    fill: DEFAULT_FILL,
    wallHeight: DEFAULT_ROOM_WALL_HEIGHT_CM,
    shape,
    planWidthCm: bbox.w,
    planDepthCm: bbox.h,
    lockedWalls: [],
    roofType: 'geen',
    ceiling: { type: 'vlak', height: DEFAULT_ROOM_WALL_HEIGHT_CM },
  }

  return {
    doc: {
      rooms: { [defaultRoomId]: room },
      roomOrder: [defaultRoomId],
      elements: {},
      canvasTextNotes: {},
      canvasTextNoteOrder: [],
      measureLines: [],
    },
    defaultRoomId,
  }
}
