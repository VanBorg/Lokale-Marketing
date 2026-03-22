import type { Room } from './roomTypes';
import { ensureVertices } from './vertices';

/**
 * Returns wallIds for the room, generating them if missing or stale.
 * Convention: wallIds[i] is the ID of the wall from vertex[i] to vertex[(i+1) % n].
 * Format: "{roomId}-w{i}"
 */
export function ensureWallIds(room: Room): string[] {
  const verts = ensureVertices(room);
  const n = verts.length;
  const existing = room.wallIds;

  if (existing && existing.length === n) return existing;

  // Preserve any existing IDs for positions that still exist, generate new ones for the rest
  return Array.from({ length: n }, (_, i) =>
    existing && i < existing.length ? existing[i] : `${room.id}-w${i}`,
  );
}

/**
 * Returns a stable corner ID for the junction between two walls.
 * The two wall IDs are sorted so the result is order-independent.
 * Format: "{lower}-{higher}" (alphabetical sort)
 */
export function cornerIdFromWalls(wallId1: string, wallId2: string): string {
  return wallId1 <= wallId2
    ? `${wallId1}+${wallId2}`
    : `${wallId2}+${wallId1}`;
}

/**
 * Returns one corner ID per vertex of the room.
 * Corner at vertex[i] is the junction of wall[i-1] (incoming) and wall[i] (outgoing).
 */
export function getRoomCornerIds(room: Room): string[] {
  const wallIds = ensureWallIds(room);
  const n = wallIds.length;
  return Array.from({ length: n }, (_, i) => {
    const incoming = wallIds[(i - 1 + n) % n];
    const outgoing = wallIds[i];
    return cornerIdFromWalls(incoming, outgoing);
  });
}
