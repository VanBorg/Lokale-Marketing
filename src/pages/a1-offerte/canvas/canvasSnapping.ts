import { Room } from '../types';
import { WallId, SnapResult, SnapResultWithInfo } from './canvasTypes';
import { computeWorldWallSegments, getSnapCandidateSegments, rotateVector2D, WallSegment as RichWallSeg } from './wallSegments';
import { boundingSize, extractWallSegments, snapSpecialRoomToWallSegment } from './canvasGeometry';

const SNAP_THRESHOLD = 40;
const SNAP_THRESHOLD_SPECIAL = 50;
const MIN_OVERLAP_PX = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function offsetSegments(segs: RichWallSeg[], dx: number, dy: number): RichWallSeg[] {
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
  seg: RichWallSeg,
  wall: WallId,
  rotationDeg: number,
): boolean {
  const { nx, ny } = normalForWallId(wall);
  const rot = ((rotationDeg % 360) + 360) % 360;
  const wn = rotateVector2D(nx, ny, rot);
  return seg.outwardNormal.x * wn.x + seg.outwardNormal.y * wn.y > 0.5;
}

// ---------------------------------------------------------------------------
// Core snap logic (special rooms: Wall A / Wall B via snapSpecialRoomToWallSegment)
// ---------------------------------------------------------------------------

export function snapPosition(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
  activeWalls?: WallId[] | null,
): SnapResultWithInfo {
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return { x, y };

  // Special rooms (WC, badkamer, …): snap to host wall segments; SnapResultWithInfo.specialSnapInfo for corner-filler UI.
  if (dragged.roomType !== 'normal') {
    const { w: dw, h: dh } = boundingSize(dragged);
    let bestScore = Infinity;
    let bestResult: SnapResultWithInfo = { x, y };

    for (const other of rooms) {
      if (other.id === draggedId) continue;
      if (other.roomType !== 'normal') continue; // snap to normal rooms only (finalized or not)

      const segments = extractWallSegments(other);
      if (segments.length === 0) continue;

      for (const seg of segments) {
        const info = snapSpecialRoomToWallSegment(
          dw, dh,
          x, y,
          seg,
          segments,
          SNAP_THRESHOLD_SPECIAL,
          SNAP_THRESHOLD_SPECIAL,
        );
        if (!info) continue;

        const perpDist = Math.sqrt(
          (info.snapX - x) ** 2 + (info.snapY - y) ** 2,
        );
        const score = perpDist - (info.wallB ? 8 : 0);

        if (score < bestScore) {
          bestScore = score;
          const nSegs = segments.length;
          let snappedWall: 'top' | 'right' | 'bottom' | 'left' | undefined;
          if (nSegs === 4) {
            const wallNames: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];
            snappedWall = wallNames[seg.wallIndex % 4];
          }
          bestResult = {
            x: info.snapX,
            y: info.snapY,
            snappedToId: other.id,
            snappedWall,
            specialSnapInfo: info,
          };
        }
      }
    }
    return bestResult;
  }

  // ── Normal rooms: original wall-segment snap (unchanged) ───────────────────
  const threshold = SNAP_THRESHOLD;

  const ddx = x - dragged.x;
  const ddy = y - dragged.y;
  const allDragSegs = offsetSegments(computeWorldWallSegments(dragged), ddx, ddy);

  let dragCandidates = [...allDragSegs];

  const rotationDeg = dragged.rotation ?? 0;
  if (activeWalls && activeWalls.length > 0) {
    dragCandidates = dragCandidates.filter(seg =>
      activeWalls.some(wall => segmentMatchesActiveWall(seg, wall, rotationDeg)),
    );
    if (dragCandidates.length === 0) {
      dragCandidates = [...allDragSegs];
    }
  }

  let bestDist = threshold;
  let bestSnap: SnapResult | null = null;

  // ── Wall-to-wall snapping ─────────────────────────────────────────────────
  for (const dragSeg of dragCandidates) {
    if (dragSeg.axis === 'diagonal') continue;

    for (const other of rooms) {
      if (other.id === draggedId) continue;

      const otherCandidates = getSnapCandidateSegments(other);

      for (const otherSeg of otherCandidates) {
        if (otherSeg.axis === 'diagonal') continue;
        if (dragSeg.axis !== otherSeg.axis) continue;

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

  return bestSnap ?? { x, y };
}

/**
 * Simplified snap used after handle/vertex drag — checks all directions.
 * Special rooms use the wall-segment snap pipeline.
 */
export function snapToRooms(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
): SnapResultWithInfo {
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return { x, y };

  // Special rooms use wall-segment snap
  if (dragged.roomType !== 'normal') {
    return snapPosition(draggedId, x, y, rooms, null);
  }

  // Normal rooms: original bounding-box snap
  const threshold = SNAP_THRESHOLD;
  const { w: dw, h: dh } = boundingSize(dragged);
  let sx = x, sy = y;
  let snappedToId: string | undefined;
  let snappedWall: 'top' | 'right' | 'bottom' | 'left' | undefined;

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

function collectVertices(
  segments: RichWallSeg[],
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
