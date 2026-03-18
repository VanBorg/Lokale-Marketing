import { Room, ensureVertices } from '../types';
import { WallId, SnapResult, PX_PER_M, SNAP_THRESHOLD, SNAP_THRESHOLD_SPECIAL } from './canvasTypes';
import { boundingSize } from './canvasGeometry';

/**
 * Extract all snap-worthy positions from a room's actual geometry.
 *
 * For axis-aligned wall segments: records the exact X or Y position of that wall.
 * For ALL vertices (corners): records their X and Y as snap points.
 * This means:
 *   - Orthogonal rooms (L, T, U, Z, S, I, plus): perfect wall-to-wall snapping
 *   - Diagonal rooms (trapezium, vijfhoek): corner-to-corner/wall snapping
 *   - Rectangles: works like before but with vertex data instead of bounding box
 */
type SnapEdges = {
  xPositions: number[]; // world-pixel X positions to snap to
  yPositions: number[]; // world-pixel Y positions to snap to
};

function isIShape(room: Room): boolean {
  return room.shape === 'i-vorm';
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function getLocalBoundsPx(verts: { x: number; y: number }[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of verts) {
    const x = v.x * PX_PER_M;
    const y = v.y * PX_PER_M;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function getSnapEdges(room: Room): SnapEdges {
  const verts = ensureVertices(room);
  const xSet = new Set<number>();
  const ySet = new Set<number>();
  const EPS = 0.5;

  if (isIShape(room)) {
    const bounds = getLocalBoundsPx(verts);
    xSet.add(round2(room.x + bounds.minX));
    xSet.add(round2(room.x + bounds.maxX));
    ySet.add(round2(room.y + bounds.minY));
    ySet.add(round2(room.y + bounds.maxY));
    return {
      xPositions: Array.from(xSet).sort((a, b) => a - b),
      yPositions: Array.from(ySet).sort((a, b) => a - b),
    };
  }

  for (let i = 0; i < verts.length; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % verts.length];
    const x1 = room.x + v1.x * PX_PER_M;
    const y1 = room.y + v1.y * PX_PER_M;
    const x2 = room.x + v2.x * PX_PER_M;
    const y2 = room.y + v2.y * PX_PER_M;

    // Axis-aligned vertical segment -> snap on its X position
    if (Math.abs(x1 - x2) < EPS) {
      xSet.add(round2((x1 + x2) / 2));
    }
    // Axis-aligned horizontal segment -> snap on its Y position
    if (Math.abs(y1 - y2) < EPS) {
      ySet.add(round2((y1 + y2) / 2));
    }

    // Always add vertex corner points as snap targets (handles diagonal walls)
    xSet.add(round2(x1));
    ySet.add(round2(y1));
  }

  return {
    xPositions: Array.from(xSet).sort((a, b) => a - b),
    yPositions: Array.from(ySet).sort((a, b) => a - b),
  };
}

/**
 * Get the local (relative to room origin) snap positions for the dragged room.
 * These are the X/Y positions of the dragged room's own edges and corners.
 */
function getLocalSnapOffsets(room: Room): { xOffsets: number[]; yOffsets: number[] } {
  const verts = ensureVertices(room);
  const xSet = new Set<number>();
  const ySet = new Set<number>();
  const EPS = 0.5;

  if (isIShape(room)) {
    const bounds = getLocalBoundsPx(verts);
    xSet.add(round2(bounds.minX));
    xSet.add(round2(bounds.maxX));
    ySet.add(round2(bounds.minY));
    ySet.add(round2(bounds.maxY));
    return {
      xOffsets: Array.from(xSet).sort((a, b) => a - b),
      yOffsets: Array.from(ySet).sort((a, b) => a - b),
    };
  }

  for (let i = 0; i < verts.length; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % verts.length];
    const x1 = v1.x * PX_PER_M;
    const y1 = v1.y * PX_PER_M;
    const x2 = v2.x * PX_PER_M;
    const y2 = v2.y * PX_PER_M;

    if (Math.abs(x1 - x2) < EPS) {
      xSet.add(round2((x1 + x2) / 2));
    }
    if (Math.abs(y1 - y2) < EPS) {
      ySet.add(round2((y1 + y2) / 2));
    }

    xSet.add(round2(x1));
    ySet.add(round2(y1));
  }

  return {
    xOffsets: Array.from(xSet).sort((a, b) => a - b),
    yOffsets: Array.from(ySet).sort((a, b) => a - b),
  };
}

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
  const { w: dw, h: dh } = boundingSize(dragged);
  let sx = x, sy = y;
  let snappedToId: string | undefined;
  let snappedWall: 'top' | 'right' | 'bottom' | 'left' | undefined;

  const dragOffsets = getLocalSnapOffsets(dragged);

  const walls: readonly WallId[] = activeWalls && activeWalls.length > 0
    ? activeWalls
    : ['left', 'right', 'top', 'bottom'];
  const checkX = walls.includes('left') || walls.includes('right') || walls.length === 4;
  const checkY = walls.includes('top') || walls.includes('bottom') || walls.length === 4;

  // Snap X: compare each X edge/corner of dragged room to each X edge/corner of other rooms
  if (checkX) {
    let bestDist = threshold;
    for (const other of rooms) {
      if (other.id === draggedId) continue;
      const otherEdges = getSnapEdges(other);

      for (const dragOffset of dragOffsets.xOffsets) {
        const dragEdgeWorld = x + dragOffset;
        for (const otherX of otherEdges.xPositions) {
          const dist = Math.abs(dragEdgeWorld - otherX);
          if (dist >= bestDist) continue;
          const candidateSx = x + (otherX - dragEdgeWorld);
          bestDist = dist;
          sx = candidateSx;
          snappedToId = other.id;
          snappedWall = dragOffset < dw / 2 ? 'left' : 'right';
        }
      }
    }
  }

  // Snap Y: compare each Y edge/corner of dragged room to each Y edge/corner of other rooms
  if (checkY) {
    let bestDist = threshold;
    for (const other of rooms) {
      if (other.id === draggedId) continue;
      const otherEdges = getSnapEdges(other);

      for (const dragOffset of dragOffsets.yOffsets) {
        const dragEdgeWorld = y + dragOffset;
        for (const otherY of otherEdges.yPositions) {
          const dist = Math.abs(dragEdgeWorld - otherY);
          if (dist >= bestDist) continue;
          const candidateSy = y + (otherY - dragEdgeWorld);
          bestDist = dist;
          sy = candidateSy;
          snappedToId = other.id;
          snappedWall = dragOffset < dh / 2 ? 'top' : 'bottom';
        }
      }
    }
  }

  return { x: sx, y: sy, snappedToId, snappedWall };
}

/**
 * Simplified snap used after handle/vertex drag - checks all directions.
 */
export function snapToRooms(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
): SnapResult {
  return snapPosition(draggedId, x, y, rooms, null);
}
