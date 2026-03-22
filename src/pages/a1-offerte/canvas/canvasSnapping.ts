import { Room } from '../types';
import { WallId, SnapResultWithInfo } from './canvasTypes';
import {
  buildWallSegmentsEx,
  getAllWallSegmentsEx,
  getAllRoomCorners,
  buildRoomCorners,
  findParallelSegments,
  computeWallToWallSnap,
  type WallSegmentEx,
} from './canvasWallSegments';
import { rotateVector2D } from './wallSegments';
import { boundingSize, extractWallSegments, snapSpecialRoomToWallSegment } from './canvasGeometry';

const SNAP_THRESHOLD = 40;
const SNAP_THRESHOLD_SPECIAL = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function offsetSegmentsEx(segs: WallSegmentEx[], dx: number, dy: number): WallSegmentEx[] {
  return segs.map(s => ({
    ...s,
    p1: { x: s.p1.x + dx, y: s.p1.y + dy },
    p2: { x: s.p2.x + dx, y: s.p2.y + dy },
    midpoint: { x: s.midpoint.x + dx, y: s.midpoint.y + dy },
  }));
}

function normalForWallId(wall: WallId): { nx: number; ny: number } {
  switch (wall) {
    case 'left':   return { nx: -1, ny: 0 };
    case 'right':  return { nx:  1, ny: 0 };
    case 'top':    return { nx: 0, ny: -1 };
    case 'bottom': return { nx: 0, ny:  1 };
  }
}

function segmentMatchesActiveWall(
  seg: WallSegmentEx,
  wall: WallId,
  rotationDeg: number,
): boolean {
  const { nx, ny } = normalForWallId(wall);
  const rot = ((rotationDeg % 360) + 360) % 360;
  const wn = rotateVector2D(nx, ny, rot);
  return seg.outwardNormal.x * wn.x + seg.outwardNormal.y * wn.y > 0.5;
}

// ---------------------------------------------------------------------------
// Unified entry point
// ---------------------------------------------------------------------------

/**
 * Unified snap function.
 *
 * - When `activeWalls` is provided and non-empty, wall-segment snap is used
 *   for normal rooms.
 * - When `activeWalls` is null/undefined/empty, bounding-box snap is used as
 *   a fallback for normal rooms.
 * - Special rooms: corner-to-corner snap has priority, then wall-segment snap
 *   (Wall A / Wall B), using the legacy geometry helpers.
 */
export function snapToGrid(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
  activeWalls?: WallId[] | null,
): SnapResultWithInfo {
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return { x, y };

  if (dragged.roomType !== 'normal') {
    return _snapSpecialRoom(draggedId, x, y, rooms);
  }

  if (activeWalls && activeWalls.length > 0) {
    return _snapNormalWallSegment(draggedId, x, y, rooms, dragged, activeWalls);
  }
  return _snapNormalBbox(draggedId, x, y, rooms, dragged);
}

/** @deprecated use snapToGrid */
export function snapPosition(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
  activeWalls?: WallId[] | null,
): SnapResultWithInfo {
  return snapToGrid(draggedId, x, y, rooms, activeWalls);
}

/**
 * Simplified snap used after handle/vertex drag — checks all directions.
 * @deprecated use snapToGrid
 */
export function snapToRooms(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
): SnapResultWithInfo {
  return snapToGrid(draggedId, x, y, rooms, null);
}

// ---------------------------------------------------------------------------
// Special room snap (corner priority → wall A/B)
// ---------------------------------------------------------------------------

function _snapSpecialRoom(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
): SnapResultWithInfo {
  const dragged = rooms.find(r => r.id === draggedId)!;

  // ── 1. Corner-to-corner snap (highest priority) ──────────────────────────
  const finalizedOthers = rooms.filter(r => r.id !== draggedId && r.isFinalized);
  const targetCorners = getAllRoomCorners(finalizedOthers);

  if (targetCorners.length > 0) {
    // Build corners of the dragged room at candidate position
    const candidateRoom: Room = { ...dragged, x, y };
    const dragCorners = buildRoomCorners(candidateRoom);

    let bestCornerDist = SNAP_THRESHOLD_SPECIAL;
    let bestCornerSnap: SnapResultWithInfo | null = null;

    for (const dc of dragCorners) {
      for (const tc of targetCorners) {
        const dist = Math.sqrt((dc.x - tc.x) ** 2 + (dc.y - tc.y) ** 2);
        if (dist < bestCornerDist) {
          bestCornerDist = dist;
          // Move dragged room so that dc.x/y coincides with tc.x/y
          const snapX = x + (tc.x - dc.x);
          const snapY = y + (tc.y - dc.y);
          bestCornerSnap = {
            x: snapX,
            y: snapY,
            snappedToId: tc.roomId,
            snappedWall: tc.wallId2,
          };
        }
      }
    }

    if (bestCornerSnap) return bestCornerSnap;
  }

  // ── 2. Wall A / Wall B segment snap (existing logic) ────────────────────
  const { w: dw, h: dh } = boundingSize(dragged);
  let bestScore = Infinity;
  let bestResult: SnapResultWithInfo = { x, y };

  for (const other of rooms) {
    if (other.id === draggedId) continue;
    if (other.roomType !== 'normal') continue;

    const segments = extractWallSegments(other);
    if (segments.length === 0) continue;

    for (const seg of segments) {
      const info = snapSpecialRoomToWallSegment(
        dw, dh, x, y, seg, segments,
        SNAP_THRESHOLD_SPECIAL, SNAP_THRESHOLD_SPECIAL,
      );
      if (!info) continue;

      const perpDist = Math.sqrt((info.snapX - x) ** 2 + (info.snapY - y) ** 2);
      const score = perpDist - (info.wallB ? 8 : 0);

      if (score < bestScore) {
        bestScore = score;
        const nSegs = segments.length;
        let snappedWall: string | undefined;
        if (nSegs === 4) {
          const wallNames: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];
          snappedWall = wallNames[seg.wallIndex % 4];
        }
        bestResult = { x: info.snapX, y: info.snapY, snappedToId: other.id, snappedWall, specialSnapInfo: info };
      }
    }
  }
  return bestResult;
}

// ---------------------------------------------------------------------------
// Normal room — wall-segment snap
// ---------------------------------------------------------------------------

function _snapNormalWallSegment(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
  dragged: Room,
  activeWalls: WallId[],
): SnapResultWithInfo {
  const ddx = x - dragged.x;
  const ddy = y - dragged.y;

  // Build the dragged room's segments at the candidate position
  const allDragSegsEx = offsetSegmentsEx(buildWallSegmentsEx(dragged), ddx, ddy);
  const rotationDeg = dragged.rotation ?? 0;

  let dragCandidates = allDragSegsEx.filter(seg =>
    activeWalls.some(wall => segmentMatchesActiveWall(seg, wall, rotationDeg)),
  );
  if (dragCandidates.length === 0) dragCandidates = [...allDragSegsEx];

  // All segments from other rooms as snap candidates
  const otherSegs = getAllWallSegmentsEx(rooms, draggedId);

  let bestDx = 0;
  let bestDy = 0;
  let bestDxDist = SNAP_THRESHOLD;
  let bestDyDist = SNAP_THRESHOLD;
  let snappedToId: string | undefined;
  let snappedWall: string | undefined;

  for (const dragSeg of dragCandidates) {
    if (dragSeg.axis === 'diagonal') continue;

    const matches = findParallelSegments(dragSeg, otherSegs, SNAP_THRESHOLD);
    if (matches.length === 0) continue;

    const best = matches[0]; // already sorted by distPx ascending
    const snap = computeWallToWallSnap(dragSeg, best.segment);

    if (dragSeg.axis === 'horizontal' && best.distPx < bestDyDist) {
      bestDyDist = best.distPx;
      bestDy = snap.dy;
      snappedToId = best.segment.roomId;
      snappedWall = best.segment.wallId;
    } else if (dragSeg.axis === 'vertical' && best.distPx < bestDxDist) {
      bestDxDist = best.distPx;
      bestDx = snap.dx;
      snappedToId = best.segment.roomId;
      snappedWall = best.segment.wallId;
    }
  }

  // Diagonal / vertex snapping for free-form rooms
  const hasDiagonal = allDragSegsEx.some(s => s.axis === 'diagonal');
  if (hasDiagonal) {
    const dragVerts = collectVerticesEx(allDragSegsEx);
    for (const other of rooms) {
      if (other.id === draggedId) continue;
      const otherVerts = collectVerticesEx(buildWallSegmentsEx(other));
      for (const dv of dragVerts) {
        for (const ov of otherVerts) {
          const ex = ov.x - dv.x, ey = ov.y - dv.y;
          const dist = Math.sqrt(ex * ex + ey * ey);
          if (dist < Math.min(bestDxDist, bestDyDist)) {
            bestDxDist = dist;
            bestDyDist = dist;
            bestDx = ex;
            bestDy = ey;
            snappedToId = other.id;
          }
        }
      }
    }
  }

  if (bestDx === 0 && bestDy === 0) return { x, y };
  return { x: x + bestDx, y: y + bestDy, snappedToId, snappedWall };
}

// ---------------------------------------------------------------------------
// Normal room — bounding-box snap (fallback)
// ---------------------------------------------------------------------------

function _snapNormalBbox(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
  dragged: Room,
): SnapResultWithInfo {
  const threshold = SNAP_THRESHOLD;
  const { w: dw, h: dh } = boundingSize(dragged);
  let sx = x, sy = y;
  let snappedToId: string | undefined;
  let snappedWall: string | undefined;

  let bestDx = threshold;
  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const { w: ow } = boundingSize(other);
    const distL = Math.abs(x - (other.x + ow));
    if (distL < bestDx) { bestDx = distL; sx = other.x + ow; snappedToId = other.id; snappedWall = 'left'; }
    const distR = Math.abs((x + dw) - other.x);
    if (distR < bestDx) { bestDx = distR; sx = other.x - dw; snappedToId = other.id; snappedWall = 'right'; }
  }

  let bestDy = threshold;
  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const { h: oh } = boundingSize(other);
    const distT = Math.abs(y - (other.y + oh));
    if (distT < bestDy) { bestDy = distT; sy = other.y + oh; snappedToId = other.id; snappedWall = 'top'; }
    const distB = Math.abs((y + dh) - other.y);
    if (distB < bestDy) { bestDy = distB; sy = other.y - dh; snappedToId = other.id; snappedWall = 'bottom'; }
  }

  return { x: sx, y: sy, snappedToId, snappedWall };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function collectVerticesEx(segments: WallSegmentEx[]): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const EPS = 0.5;
  for (const s of segments) {
    const addIfNew = (p: { x: number; y: number }) => {
      if (!pts.some(q => Math.abs(q.x - p.x) < EPS && Math.abs(q.y - p.y) < EPS)) {
        pts.push(p);
      }
    };
    addIfNew(s.p1);
    addIfNew(s.p2);
  }
  return pts;
}
