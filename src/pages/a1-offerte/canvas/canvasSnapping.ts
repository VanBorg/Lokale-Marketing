import { Room, ensureVertices } from '../types';
import { WallId, SnapResult, PX_PER_M, SNAP_THRESHOLD, SNAP_THRESHOLD_SPECIAL } from './canvasTypes';
import { boundingSize } from './canvasGeometry';

/**
 * Extract all unique x and y coordinates from a room's vertices,
 * returned as pixel offsets from the room's (x, y) position that
 * account for the Konva rotation transform (pivot = boundingSize centre).
 * Works universally for rectangles, L-shapes, vrije-vorm, etc.
 */
function getLocalEdgeCoords(room: Room): { x: number[]; y: number[] } {
  const verts = ensureVertices(room);
  const { w, h } = boundingSize(room);
  const cx = w / 2;
  const cy = h / 2;
  const rot = room.rotation || 0;
  const rad = (rot * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const xSet = new Set<number>();
  const ySet = new Set<number>();
  for (const v of verts) {
    const lx = v.x * PX_PER_M;
    const ly = v.y * PX_PER_M;
    const dx = lx - cx;
    const dy = ly - cy;
    xSet.add(Math.round((dx * cosR - dy * sinR + cx) * 100) / 100);
    ySet.add(Math.round((dx * sinR + dy * cosR + cy) * 100) / 100);
  }
  return {
    x: Array.from(xSet).sort((a, b) => a - b),
    y: Array.from(ySet).sort((a, b) => a - b),
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

  const walls: readonly WallId[] = activeWalls && activeWalls.length > 0 ? activeWalls : ['left', 'right', 'top', 'bottom'];

  const snapTargets = dragged.roomType !== 'normal'
    ? rooms.filter(r => r.id !== draggedId && r.roomType === 'normal')
    : rooms.filter(r => r.id !== draggedId);

  const dragEdges = getLocalEdgeCoords(dragged);
  const hasXWalls = walls.includes('left') || walls.includes('right');
  const hasYWalls = walls.includes('top') || walls.includes('bottom');

  if (hasXWalls) {
    let bestDx = threshold;
    for (const other of snapTargets) {
      const otherEdges = getLocalEdgeCoords(other);
      for (const de of dragEdges.x) {
        for (const oe of otherEdges.x) {
          const dist = Math.abs((x + de) - (other.x + oe));
          if (dist < bestDx) {
            bestDx = dist;
            sx = other.x + oe - de;
            snappedToId = other.id;
            snappedWall = de <= dw / 2 ? 'left' : 'right';
          }
        }
      }
    }
  }

  if (hasYWalls) {
    let bestDy = threshold;
    for (const other of snapTargets) {
      const otherEdges = getLocalEdgeCoords(other);
      for (const de of dragEdges.y) {
        for (const oe of otherEdges.y) {
          const dist = Math.abs((y + de) - (other.y + oe));
          if (dist < bestDy) {
            bestDy = dist;
            sy = other.y + oe - de;
            snappedToId = other.id;
            snappedWall = de <= dh / 2 ? 'top' : 'bottom';
          }
        }
      }
    }
  }

  if (!hasXWalls && !hasYWalls) {
    let bestDx = threshold;
    let bestDy = threshold;
    for (const other of snapTargets) {
      const otherEdges = getLocalEdgeCoords(other);
      for (const de of dragEdges.x) {
        for (const oe of otherEdges.x) {
          const dist = Math.abs((x + de) - (other.x + oe));
          if (dist < bestDx) {
            bestDx = dist;
            sx = other.x + oe - de;
            snappedToId = other.id;
            snappedWall = de <= dw / 2 ? 'left' : 'right';
          }
        }
      }
      for (const de of dragEdges.y) {
        for (const oe of otherEdges.y) {
          const dist = Math.abs((y + de) - (other.y + oe));
          if (dist < bestDy) {
            bestDy = dist;
            sy = other.y + oe - de;
            snappedToId = other.id;
            snappedWall = de <= dh / 2 ? 'top' : 'bottom';
          }
        }
      }
    }
  }

  if (dragged.roomType !== 'normal' && snappedToId && snappedWall) {
    const other = rooms.find(r => r.id === snappedToId);
    if (other) {
      const oh = boundingSize(other).h;
      const ow = boundingSize(other).w;
      if (snappedWall === 'left' || snappedWall === 'right') {
        const minY = other.y - dh + 1;
        const maxY = other.y + oh - 1;
        sy = Math.max(minY, Math.min(maxY, sy));
      } else {
        const minX = other.x - dw + 1;
        const maxX = other.x + ow - 1;
        sx = Math.max(minX, Math.min(maxX, sx));
      }
    }
  }

  return { x: sx, y: sy, snappedToId, snappedWall };
}

export function snapToRooms(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
): SnapResult {
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return { x, y };

  const threshold = dragged.roomType !== 'normal' ? SNAP_THRESHOLD_SPECIAL : SNAP_THRESHOLD;
  const { w: dw, h: dh } = boundingSize(dragged);
  let sx = x, sy = y;
  let snappedToId: string | undefined;
  let snappedWall: 'top' | 'right' | 'bottom' | 'left' | undefined;

  const dragEdges = getLocalEdgeCoords(dragged);

  let bestDx = threshold;
  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const otherEdges = getLocalEdgeCoords(other);
    for (const de of dragEdges.x) {
      for (const oe of otherEdges.x) {
        const dist = Math.abs((x + de) - (other.x + oe));
        if (dist < bestDx) {
          bestDx = dist;
          sx = other.x + oe - de;
          snappedToId = other.id;
          snappedWall = de <= dw / 2 ? 'left' : 'right';
        }
      }
    }
  }

  let bestDy = threshold;
  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const otherEdges = getLocalEdgeCoords(other);
    for (const de of dragEdges.y) {
      for (const oe of otherEdges.y) {
        const dist = Math.abs((y + de) - (other.y + oe));
        if (dist < bestDy) {
          bestDy = dist;
          sy = other.y + oe - de;
          snappedToId = other.id;
          snappedWall = de <= dh / 2 ? 'top' : 'bottom';
        }
      }
    }
  }

  return { x: sx, y: sy, snappedToId, snappedWall };
}
