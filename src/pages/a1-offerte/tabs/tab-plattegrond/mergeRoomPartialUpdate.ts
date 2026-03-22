import type { Room } from '../../types';
import { ensureVertices, verticesBoundingBox, syncRoomFromVertices, ensureWallIds } from '../../types';

/**
 * Applies partial updates to a single room, including vertex scaling when length/width change.
 */
export function mergeRoomPartialUpdate(r: Room, updates: Partial<Room>): Room {
  const merged = { ...r, ...updates };

  if (updates.wallLengths) {
    if (updates.length === undefined) merged.length = updates.wallLengths.top;
    if (updates.width === undefined) merged.width = updates.wallLengths.right;
    return merged;
  }

  const baseVerts = (r.vertices && r.vertices.length >= 3)
    ? r.vertices
    : ensureVertices(r);

  const baseBB = verticesBoundingBox(baseVerts);
  const actualLength = Math.max(baseBB.w, 0.01);
  const actualWidth  = Math.max(baseBB.h, 0.01);

  let scaledVerts = baseVerts;
  let didScale = false;

  if (updates.length !== undefined && updates.length > 0) {
    const scaleX = updates.length / actualLength;
    scaledVerts = scaledVerts.map(v => ({ x: v.x * scaleX, y: v.y }));
    didScale = true;
  }

  if (updates.width !== undefined && updates.width > 0) {
    const scaleY = updates.width / actualWidth;
    scaledVerts = scaledVerts.map(v => ({ x: v.x, y: v.y * scaleY }));
    didScale = true;
  }

  if (didScale) {
    merged.vertices = scaledVerts;
    const synced = syncRoomFromVertices(scaledVerts);
    merged.wallLengths = synced.wallLengths;
    merged.length = updates.length ?? synced.length;
    merged.width  = updates.width  ?? synced.width;
    // Regenerate wallIds: preserve existing IDs for unchanged positions, add/remove for resized vertex count
    merged.wallIds = ensureWallIds(merged);
  }

  // Also regenerate wallIds when vertices are directly replaced with a different count
  if (updates.vertices && updates.vertices.length !== (r.vertices ?? []).length) {
    merged.wallIds = ensureWallIds(merged);
  }

  return merged;
}
