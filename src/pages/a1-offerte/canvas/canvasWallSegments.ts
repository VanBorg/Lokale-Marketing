/**
 * Wall-ID-aware segment and corner types built on top of wallSegments.ts.
 * Every segment carries a stable wallId from room.wallIds so that snapping,
 * wizard gap-detection, and corner-fill logic can reference walls by ID.
 */

import type { Room } from '../types';
import { ensureWallIds, cornerIdFromWalls } from '../types';
import { computeWorldWallSegments, type WallSegment } from './wallSegments';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Wall segment enriched with a stable wallId. */
export type WallSegmentEx = WallSegment & { wallId: string };

/** A corner (vertex) of a room, identified by the two walls that meet there. */
export type RoomCorner = {
  /** "{wallId1}+{wallId2}" — stable, order-independent. */
  cornerId: string;
  roomId: string;
  /** ID of the incoming wall (vertex[i-1] → vertex[i]). */
  wallId1: string;
  /** ID of the outgoing wall (vertex[i] → vertex[i+1]). */
  wallId2: string;
  /** World-pixel X position of the corner. */
  x: number;
  /** World-pixel Y position of the corner. */
  y: number;
  /** Inward (interior) angle in radians. */
  angle: number;
  /** True when this corner is convex on the polygon exterior. */
  isConvex: boolean;
};

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------

/**
 * Returns all wall segments for a room, each enriched with its stable wallId.
 */
export function buildWallSegmentsEx(room: Room): WallSegmentEx[] {
  const segs = computeWorldWallSegments(room);
  const wallIds = ensureWallIds(room);
  return segs.map(seg => ({
    ...seg,
    wallId: wallIds[seg.wallIndex] ?? `${room.id}-w${seg.wallIndex}`,
  }));
}

/**
 * Returns all corners of a room.
 * Corner at vertex[i] is the junction of the incoming wall (i-1 → i) and
 * the outgoing wall (i → i+1).
 */
export function buildRoomCorners(room: Room): RoomCorner[] {
  const segs = buildWallSegmentsEx(room);
  if (segs.length < 2) return [];

  const n = segs.length;
  const corners: RoomCorner[] = [];

  for (let i = 0; i < n; i++) {
    // Incoming segment ends at vertex[i] = seg[i-1].p2
    const incoming = segs[(i - 1 + n) % n];
    // Outgoing segment starts at vertex[i] = seg[i].p1
    const outgoing = segs[i];

    const x = outgoing.p1.x;
    const y = outgoing.p1.y;

    // Inward angle: angle between incoming direction (reversed) and outgoing direction
    const inDx = incoming.p1.x - incoming.p2.x; // reversed = pointing away from corner
    const inDy = incoming.p1.y - incoming.p2.y;
    const outDx = outgoing.p2.x - outgoing.p1.x;
    const outDy = outgoing.p2.y - outgoing.p1.y;

    const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
    const outLen = Math.sqrt(outDx * outDx + outDy * outDy);

    let angle = Math.PI; // fallback
    if (inLen > 1e-6 && outLen > 1e-6) {
      const dot = (inDx * outDx + inDy * outDy) / (inLen * outLen);
      angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    }

    corners.push({
      cornerId: cornerIdFromWalls(incoming.wallId, outgoing.wallId),
      roomId: room.id,
      wallId1: incoming.wallId,
      wallId2: outgoing.wallId,
      x,
      y,
      angle,
      isConvex: outgoing.isConvex,
    });
  }

  return corners;
}

// ---------------------------------------------------------------------------
// Multi-room helpers
// ---------------------------------------------------------------------------

/** All wall segments across multiple rooms, optionally excluding one room. */
export function getAllWallSegmentsEx(rooms: Room[], excludeId?: string): WallSegmentEx[] {
  const result: WallSegmentEx[] = [];
  for (const room of rooms) {
    if (room.id === excludeId) continue;
    result.push(...buildWallSegmentsEx(room));
  }
  return result;
}

/** All corners across multiple rooms, optionally excluding one room. */
export function getAllRoomCorners(rooms: Room[], excludeId?: string): RoomCorner[] {
  const result: RoomCorner[] = [];
  for (const room of rooms) {
    if (room.id === excludeId) continue;
    result.push(...buildRoomCorners(room));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Snap utilities
// ---------------------------------------------------------------------------

/**
 * Finds segments in `candidates` that are parallel to `seg` and within
 * `maxDistPx` perpendicular distance, with at least some overlap.
 * Parallel = same axis, opposing outward normals (dot < -0.7).
 */
export function findParallelSegments(
  seg: WallSegmentEx,
  candidates: WallSegmentEx[],
  maxDistPx: number,
): Array<{ segment: WallSegmentEx; distPx: number; overlapPx: number }> {
  const results: Array<{ segment: WallSegmentEx; distPx: number; overlapPx: number }> = [];

  for (const cand of candidates) {
    // Must have same axis
    if (cand.axis !== seg.axis) continue;
    // Must have opposing normals (one faces the other)
    const dot =
      seg.outwardNormal.x * cand.outwardNormal.x +
      seg.outwardNormal.y * cand.outwardNormal.y;
    if (dot > -0.7) continue;

    // Perpendicular distance (project midpoint delta onto seg's outward normal)
    const dmx = cand.midpoint.x - seg.midpoint.x;
    const dmy = cand.midpoint.y - seg.midpoint.y;
    const distPx = Math.abs(dmx * seg.outwardNormal.x + dmy * seg.outwardNormal.y);

    if (distPx > maxDistPx) continue;

    // Projected overlap along the wall axis (tangent direction)
    const tx = seg.outwardNormal.y; // tangent = rotate normal 90°
    const ty = -seg.outwardNormal.x;

    const s1 = seg.p1.x * tx + seg.p1.y * ty;
    const s2 = seg.p2.x * tx + seg.p2.y * ty;
    const c1 = cand.p1.x * tx + cand.p1.y * ty;
    const c2 = cand.p2.x * tx + cand.p2.y * ty;

    const overlapStart = Math.max(Math.min(s1, s2), Math.min(c1, c2));
    const overlapEnd = Math.min(Math.max(s1, s2), Math.max(c1, c2));
    const overlapPx = overlapEnd - overlapStart;

    if (overlapPx < 4) continue; // require at least 4px overlap

    results.push({ segment: cand, distPx, overlapPx });
  }

  results.sort((a, b) => a.distPx - b.distPx);
  return results;
}

/**
 * Computes the (dx, dy) needed to move `movingSeg` flush against `targetSeg`.
 * The delta is along the outward normal of `movingSeg` (push direction).
 */
export function computeWallToWallSnap(
  movingSeg: WallSegmentEx,
  targetSeg: WallSegmentEx,
): { dx: number; dy: number } {
  // The moving wall's outward normal points away from its room.
  // The target wall's outward normal points away from its room.
  // When they snap flush, the moving wall's face meets the target wall's face:
  // project both midpoints onto movingSeg's outward normal direction.
  const nx = movingSeg.outwardNormal.x;
  const ny = movingSeg.outwardNormal.y;

  const movingProj = movingSeg.midpoint.x * nx + movingSeg.midpoint.y * ny;
  const targetProj = targetSeg.midpoint.x * nx + targetSeg.midpoint.y * ny;

  // Delta = targetProj - movingProj (move moving wall so its face meets target face)
  const dist = targetProj - movingProj;
  return { dx: dist * nx, dy: dist * ny };
}
