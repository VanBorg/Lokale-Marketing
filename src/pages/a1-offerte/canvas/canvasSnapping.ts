import { Room } from '../types';
import { WallId, SnapResult } from './canvasTypes';
import { computeWorldWallSegments, getSnapCandidateSegments, rotateVector2D, WallSegment } from './wallSegments';
import { boundingSize } from './canvasGeometry';

const SNAP_THRESHOLD = 40;
const SNAP_THRESHOLD_SPECIAL = 50;
const MIN_OVERLAP_PX = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function offsetSegments(segs: WallSegment[], dx: number, dy: number): WallSegment[] {
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

/**
 * `wall` is in local room space (Konva child coords); segment normals are in world space
 * after `rotationDeg`. Rotate the local outward normal to compare.
 */
function segmentMatchesActiveWall(
  seg: WallSegment,
  wall: WallId,
  rotationDeg: number,
): boolean {
  const { nx, ny } = normalForWallId(wall);
  const rot = ((rotationDeg % 360) + 360) % 360;
  const wn = rotateVector2D(nx, ny, rot);
  return seg.outwardNormal.x * wn.x + seg.outwardNormal.y * wn.y > 0.5;
}

// ---------------------------------------------------------------------------
// Core snap logic
// ---------------------------------------------------------------------------

export function snapPosition(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
  activeWalls?: WallId[] | null,
): SnapResult {
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return { x, y };

  const threshold = dragged.roomType !== 'normal' ? SNAP_THRESHOLD_SPECIAL : SNAP_THRESHOLD;

  // Compute all segments once, then derive candidates via filter
  const ddx = x - dragged.x;
  const ddy = y - dragged.y;
  const allDragSegs = offsetSegments(computeWorldWallSegments(dragged), ddx, ddy);

  // All walls are valid snap candidates — step walls of L/T/Z/S shapes are included.
  // The snapping loop itself filters out diagonals and checks opposing normals + overlap.
  let dragCandidates = [...allDragSegs];

  // Filter by activeWalls if provided (normals must match world space → rotate by dragged.rotation)
  const rotationDeg = dragged.rotation ?? 0;
  if (activeWalls && activeWalls.length > 0) {
    dragCandidates = dragCandidates.filter(seg =>
      activeWalls.some(wall => segmentMatchesActiveWall(seg, wall, rotationDeg))
    );
    // Hardening: if everything was filtered out (unexpected), fall back to all walls
    if (dragCandidates.length === 0) {
      dragCandidates = [...allDragSegs];
    }
  }

  let bestDist = threshold;
  let bestSnap: SnapResult | null = null;

  // ── Wall-to-wall snapping ─────────────────────────────────────────────────
  for (const dragSeg of dragCandidates) {
    // Skip diagonal walls for position snapping (vertex-snap only)
    if (dragSeg.axis === 'diagonal') continue;

    for (const other of rooms) {
      if (other.id === draggedId) continue;

      const otherCandidates = getSnapCandidateSegments(other);

      for (const otherSeg of otherCandidates) {
        if (otherSeg.axis === 'diagonal') continue;

        // Must be same axis
        if (dragSeg.axis !== otherSeg.axis) continue;

        // Normals must be opposing: dot < -0.5
        const dot = dragSeg.outwardNormal.x * otherSeg.outwardNormal.x
                  + dragSeg.outwardNormal.y * otherSeg.outwardNormal.y;
        if (dot > -0.5) continue;

        let overlapPx: number;
        let dist: number;
        let dx = 0, dy = 0;

        if (dragSeg.axis === 'horizontal') {
          const dragMinX = Math.min(dragSeg.p1.x, dragSeg.p2.x);
          const dragMaxX = Math.max(dragSeg.p1.x, dragSeg.p2.x);
          const othMinX  = Math.min(otherSeg.p1.x, otherSeg.p2.x);
          const othMaxX  = Math.max(otherSeg.p1.x, otherSeg.p2.x);
          overlapPx = Math.min(dragMaxX, othMaxX) - Math.max(dragMinX, othMinX);
          if (overlapPx < MIN_OVERLAP_PX) continue;

          dist = Math.abs(dragSeg.p1.y - otherSeg.p1.y);
          dy = otherSeg.p1.y - dragSeg.p1.y;
        } else {
          // vertical
          const dragMinY = Math.min(dragSeg.p1.y, dragSeg.p2.y);
          const dragMaxY = Math.max(dragSeg.p1.y, dragSeg.p2.y);
          const othMinY  = Math.min(otherSeg.p1.y, otherSeg.p2.y);
          const othMaxY  = Math.max(otherSeg.p1.y, otherSeg.p2.y);
          overlapPx = Math.min(dragMaxY, othMaxY) - Math.max(dragMinY, othMinY);
          if (overlapPx < MIN_OVERLAP_PX) continue;

          dist = Math.abs(dragSeg.p1.x - otherSeg.p1.x);
          dx = otherSeg.p1.x - dragSeg.p1.x;
        }

        if (dist < bestDist) {
          bestDist = dist;
          bestSnap = {
            x: x + dx,
            y: y + dy,
            snappedToId: other.id,
            snappedWall: otherSeg.outwardNormal.y < -0.5 ? 'top'
              : otherSeg.outwardNormal.y > 0.5 ? 'bottom'
              : otherSeg.outwardNormal.x < -0.5 ? 'left'
              : 'right',
          };
        }
      }
    }
  }

  // ── Diagonal / vertex snapping ────────────────────────────────────────────
  const hasDiagonal = allDragSegs.some(s => s.axis === 'diagonal');

  if (hasDiagonal) {
    // Collect unique vertices of the dragged room at new position
    const dragVerts = collectVertices(allDragSegs);

    for (const other of rooms) {
      if (other.id === draggedId) continue;
      const otherSegs = computeWorldWallSegments(other);
      const otherVerts = collectVertices(otherSegs);

      for (const dv of dragVerts) {
        for (const ov of otherVerts) {
          const ex = ov.x - dv.x;
          const ey = ov.y - dv.y;
          const dist = Math.sqrt(ex * ex + ey * ey);
          if (dist < bestDist) {
            bestDist = dist;
            bestSnap = {
              x: x + ex,
              y: y + ey,
              snappedToId: other.id,
            };
          }
        }
      }
    }
  }

  const baseSnap: SnapResult = bestSnap ?? { x, y };

  if (dragged.roomType !== 'normal') {
    const { w: dw, h: dh } = boundingSize(dragged);
    // Use the RAW drag position to determine if the center is inside a parent room,
    // NOT baseSnap – outer wall snap must not prevent inside placement.
    const rawCenterX = x + dw / 2;
    const rawCenterY = y + dh / 2;

    let bestInside: SnapResult | null = null;
    let bestInsideDist = Number.POSITIVE_INFINITY;
    const innerSnapThreshold = 20;

    for (const other of rooms) {
      if (other.id === draggedId || other.roomType !== 'normal') continue;
      const { w: ow, h: oh } = boundingSize(other);
      const left = other.x;
      const top = other.y;
      const right = other.x + ow;
      const bottom = other.y + oh;

      const isRawCenterInside = rawCenterX > left && rawCenterX < right && rawCenterY > top && rawCenterY < bottom;
      if (!isRawCenterInside) continue;

      // Start from segment/wall snap result so flush alignment is not discarded when clamping inside parent.
      let sx = baseSnap.x;
      let sy = baseSnap.y;

      // Snap to inner walls if close enough
      if (Math.abs(sx - left) < innerSnapThreshold) sx = left;
      else if (Math.abs((sx + dw) - right) < innerSnapThreshold) sx = right - dw;

      if (Math.abs(sy - top) < innerSnapThreshold) sy = top;
      else if (Math.abs((sy + dh) - bottom) < innerSnapThreshold) sy = bottom - dh;

      // Clamp fully inside parent bounds
      sx = Math.max(left, Math.min(right - dw, sx));
      sy = Math.max(top, Math.min(bottom - dh, sy));

      const d = Math.hypot(sx - x, sy - y);
      if (d < bestInsideDist) {
        bestInsideDist = d;
        bestInside = { x: sx, y: sy, snappedToId: other.id };
      }
    }

    if (bestInside) return bestInside;
  }

  return baseSnap;
}

/**
 * Simplified snap used after handle/vertex drag — checks all directions.
 */
export function snapToRooms(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
): SnapResult {
  return snapPosition(draggedId, x, y, rooms, null);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function collectVertices(
  segments: WallSegment[],
): { x: number; y: number }[] {
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
