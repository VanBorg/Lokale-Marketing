import type { Room, RoomCeiling } from '../../store/blueprintStore'
import type { RoofType } from '../../utils/blueprintGeometry'

/** Zelfde default als `DEFAULT_WALL_HEIGHT` in blueprintStore (nieuwe kamer). */
export const DEFAULT_ROOM_WALL_HEIGHT_CM = 250

export const ROOF_OPTIONS: { id: RoofType; label: string; icon: string }[] = [
  { id: 'geen', label: 'Geen', icon: '—' },
  { id: 'plat', label: 'Plat', icon: '▬' },
  { id: 'schuin-enkel', label: 'Schuin', icon: '◺' },
  { id: 'zadeldak', label: 'Zadel', icon: '⋀' },
  { id: 'schilddak', label: 'Schild', icon: '◇' },
  { id: 'mansardedak', label: 'Mansarde', icon: '⌂' },
  { id: 'platband', label: 'Platband', icon: '▭' },
]

export const CEILING_OPTIONS: { id: RoomCeiling['type']; label: string; icon: string }[] = [
  { id: 'vlak', label: 'Vlak', icon: '▬' },
  { id: 'schuin', label: 'Schuin', icon: '◺' },
  { id: 'cassette', label: 'Cassette', icon: '⊞' },
  { id: 'gewelfd', label: 'Gewelfd', icon: '∩' },
  { id: 'open-kap', label: 'Open kap', icon: '⋀' },
]

export const CASSETTE_GRIDS = ['60×60 cm', '30×30 cm', '60×120 cm']

export function buildCeiling(
  type: RoomCeiling['type'],
  height: number,
  ridgeHeight: number,
  grid: string,
): RoomCeiling {
  return {
    type,
    height,
    ...(type !== 'vlak' && type !== 'cassette' ? { ridgeHeight } : {}),
    ...(type === 'cassette' ? { cassetteGrid: grid } : {}),
  }
}

/** Effectieve hoogte voor een vlak plafond: max van alle wandhoogtes. */
export function vlakCeilingHeightFromRoom(room: Room): number {
  const verts = room.vertices
  if (!verts.length) return room.wallHeight
  return Math.max(
    ...verts.map((_, i) => room.wallHeights?.[i] ?? room.wallHeight),
    room.wallHeight,
  )
}

export function showRoofPeakHeight(roofType: RoofType): boolean {
  return roofType !== 'geen' && roofType !== 'plat' && roofType !== 'platband'
}
