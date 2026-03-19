import { Room, ensureVertices, verticesBoundingBox } from '../types';
import { PX_PER_M } from './canvasTypes';

export type ConnectZone =
  | { type: 'full' }
  | { type: 'vertex'; point: { x: number; y: number } }
  | { type: 'partial'; from: number; to: number };

export type WallSegment = {
  roomId: string;
  wallIndex: number;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  midpoint: { x: number; y: number };
  outwardNormal: { x: number; y: number };
  lengthPx: number;
  lengthM: number;
  axis: 'horizontal' | 'vertical' | 'diagonal';
  isConvex: boolean;
  connectZone: ConnectZone;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function polygonIsClockwise(pts: { x: number; y: number }[]): boolean {
  let sum = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    sum += (a.x * b.y - b.x * a.y);
  }
  return sum > 0;
}

/**
 * Rotates a direction vector by `rotation` degrees (0/90/180/270 only).
 * Same convention as vertex rotation in this module (matches Konva room.rotation).
 */
export function rotateVector2D(vx: number, vy: number, rotation: number): { x: number; y: number } {
  switch (rotation) {
    case 90:
      return { x: -vy, y: vx };
    case 180:
      return { x: -vx, y: -vy };
    case 270:
      return { x: vy, y: -vx };
    default:
      return { x: vx, y: vy };
  }
}

// Rotates (vx, vy) around (cx, cy) by `rotation` degrees (0/90/180/270 only).
function rotatePoint(
  vx: number,
  vy: number,
  cx: number,
  cy: number,
  rotation: number,
): { x: number; y: number } {
  const dx = vx - cx;
  const dy = vy - cy;
  const r = rotateVector2D(dx, dy, rotation);
  return { x: r.x + cx, y: r.y + cy };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function computeWorldWallSegments(room: Room): WallSegment[] {
  // 1. Get vertices in local metre-space
  const localVerts = ensureVertices(room);
  if (localVerts.length < 3) return [];

  // 2. Apply rotation around bounding-box centre (metre-space)
  const bb = verticesBoundingBox(localVerts);
  const cx = bb.minX + bb.w / 2;
  const cy = bb.minY + bb.h / 2;
  const rotation = room.rotation ?? 0;

  const rotatedVerts = rotation === 0
    ? localVerts
    : localVerts.map(v => rotatePoint(v.x, v.y, cx, cy, rotation));

  // 3. Translate to world-space pixels
  const worldPts = rotatedVerts.map(v => ({
    x: room.x + v.x * PX_PER_M,
    y: room.y + v.y * PX_PER_M,
  }));

  // 4. Winding direction via shoelace
  const cw = polygonIsClockwise(worldPts);

  const n = worldPts.length;

  // 5. Per-vertex convexity: cross product of incoming × outgoing edge
  const vertexConvex: boolean[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const prev = worldPts[(i - 1 + n) % n];
    const curr = worldPts[i];
    const next = worldPts[(i + 1) % n];
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    // CW polygon: convex vertices have cross < 0 (right turn)
    // CCW polygon: convex vertices have cross > 0 (left turn)
    vertexConvex[i] = cw ? cross < 0 : cross > 0;
  }

  // 6. Build segments
  const segments: WallSegment[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = worldPts[i];
    const p2 = worldPts[(i + 1) % n];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) continue;

    // Outward normal
    let nx: number, ny: number;
    if (cw) {
      nx = dy / len;
      ny = -dx / len;
    } else {
      nx = -dy / len;
      ny = dx / len;
    }

    // Axis classification (using pixel coords)
    const absDy = Math.abs(dy);
    const absDx = Math.abs(dx);
    let axis: 'horizontal' | 'vertical' | 'diagonal';
    if (absDy < 0.5) {
      axis = 'horizontal';
    } else if (absDx < 0.5) {
      axis = 'vertical';
    } else {
      axis = 'diagonal';
    }

    const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    // A wall is convex when both its endpoint vertices are convex corners
    const isConvex = vertexConvex[i] && vertexConvex[(i + 1) % n];

    // Connect zone
    let connectZone: ConnectZone;
    if (axis === 'diagonal') {
      connectZone = { type: 'vertex', point: midpoint };
    } else if (!isConvex) {
      connectZone = { type: 'partial', from: 0, to: 1 };
    } else {
      connectZone = { type: 'full' };
    }

    segments.push({
      roomId: room.id,
      wallIndex: i,
      p1,
      p2,
      midpoint,
      outwardNormal: { x: nx, y: ny },
      lengthPx: len,
      lengthM: len / PX_PER_M,
      axis,
      isConvex,
      connectZone,
    });
  }

  return segments;
}

/**
 * Returns only the wall segments eligible for snapping:
 * convex (outer) walls. Diagonal walls are included because they
 * participate in vertex-snapping in canvasSnapping.ts.
 */
export function getSnapCandidateSegments(room: Room): WallSegment[] {
  return computeWorldWallSegments(room).filter(s => s.isConvex);
}
