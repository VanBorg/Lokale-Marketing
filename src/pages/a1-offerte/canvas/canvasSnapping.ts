import { Room } from '../types';
import { WallId, SnapResult, PX_PER_M, SNAP_THRESHOLD, SNAP_THRESHOLD_SPECIAL } from './canvasTypes';
import { boundingSize } from './canvasGeometry';

function getShapeSnapEdges(room: Room): { x: number[]; y: number[] } {
  const { w, h } = boundingSize(room);
  switch (room.shape) {
    case 'i-vorm': {
      const barH = h * 0.25;
      const stemW = w * 0.3;
      const sx = (w - stemW) / 2;
      return { x: [0, sx, sx + stemW, w], y: [0, barH, h - barH, h] };
    }
    case 't-vorm':
      return { x: [0, w * 0.33, w * 0.67, w], y: [0, h * 0.4, h] };
    case 'u-vorm':
      return { x: [0, w * 0.33, w * 0.67, w], y: [0, h * 0.6, h] };
    case 'l-vorm':
      return { x: [0, w * 0.5, w], y: [0, h * 0.5, h] };
    case 'boog':
      return { x: [0, w * 0.5, w], y: [0, h * 0.5, h] };
    default:
      return { x: [0, w], y: [0, h] };
  }
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

  // When dragging a special room (WC, Kast, Nis, etc.), only snap to normal rooms so they magnet to main walls.
  const snapTargets = dragged.roomType !== 'normal'
    ? rooms.filter(r => r.id !== draggedId && r.roomType === 'normal')
    : rooms.filter(r => r.id !== draggedId);

  const tryRoomSnapX = (): boolean => {
    let bestDx = threshold;
    for (const other of snapTargets) {
      const ow = boundingSize(other).w;
      if (walls.includes('left')) {
        const dAdj = Math.abs(x - (other.x + ow));
        if (dAdj < bestDx) { bestDx = dAdj; sx = other.x + ow; snappedToId = other.id; snappedWall = 'left'; }
        const dAlign = Math.abs(x - other.x);
        if (dAlign < bestDx) { bestDx = dAlign; sx = other.x; snappedToId = other.id; snappedWall = 'left'; }
      }
      if (walls.includes('right')) {
        const dAdj = Math.abs((x + dw) - other.x);
        if (dAdj < bestDx) { bestDx = dAdj; sx = other.x - dw; snappedToId = other.id; snappedWall = 'right'; }
        const dAlign = Math.abs((x + dw) - (other.x + ow));
        if (dAlign < bestDx) { bestDx = dAlign; sx = other.x + ow - dw; snappedToId = other.id; snappedWall = 'right'; }
      }
    }
    return bestDx < threshold;
  };

  const tryRoomSnapY = (): boolean => {
    let bestDy = threshold;
    for (const other of snapTargets) {
      const oh = boundingSize(other).h;
      if (walls.includes('top')) {
        const dAdj = Math.abs(y - (other.y + oh));
        if (dAdj < bestDy) { bestDy = dAdj; sy = other.y + oh; snappedToId = other.id; snappedWall = 'top'; }
        const dAlign = Math.abs(y - other.y);
        if (dAlign < bestDy) { bestDy = dAlign; sy = other.y; snappedToId = other.id; snappedWall = 'top'; }
      }
      if (walls.includes('bottom')) {
        const dAdj = Math.abs((y + dh) - other.y);
        if (dAdj < bestDy) { bestDy = dAdj; sy = other.y - dh; snappedToId = other.id; snappedWall = 'bottom'; }
        const dAlign = Math.abs((y + dh) - (other.y + oh));
        if (dAlign < bestDy) { bestDy = dAlign; sy = other.y + oh - dh; snappedToId = other.id; snappedWall = 'bottom'; }
      }
    }
    return bestDy < threshold;
  };

  const hasXWalls = walls.includes('left') || walls.includes('right');
  const hasYWalls = walls.includes('top') || walls.includes('bottom');

  if (hasXWalls) {
    tryRoomSnapX();
  }
  if (hasYWalls) {
    tryRoomSnapY();
  }

  if (!hasXWalls && !hasYWalls) {
    const dragEdges = getShapeSnapEdges(dragged);
    let bestDx = threshold, bestDy = threshold;
    for (const other of snapTargets) {
      const ow = boundingSize(other).w;
      const oh = boundingSize(other).h;
      for (const de of dragEdges.x) {
        const distL = Math.abs((x + de) - (other.x + ow));
        if (distL < bestDx) {
          bestDx = distL;
          sx = other.x + ow - de;
          snappedToId = other.id;
          snappedWall = 'left';
        }
        const distR = Math.abs((x + de) - other.x);
        if (distR < bestDx) {
          bestDx = distR;
          sx = other.x - de;
          snappedToId = other.id;
          snappedWall = 'right';
        }
      }
      for (const de of dragEdges.y) {
        const distT = Math.abs((y + de) - (other.y + oh));
        if (distT < bestDy) {
          bestDy = distT;
          sy = other.y + oh - de;
          snappedToId = other.id;
          snappedWall = 'top';
        }
        const distB = Math.abs((y + de) - other.y);
        if (distB < bestDy) {
          bestDy = distB;
          sy = other.y - de;
          snappedToId = other.id;
          snappedWall = 'bottom';
        }
      }
    }
  }

  // For special rooms (WC, Kast, Nis, etc.): align perpendicular axis so the room stays
  // adjacent to the target wall and detectSubRooms can set attachedWall correctly.
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

  let bestDx = threshold;
  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const ow = boundingSize(other).w;
    const distL = Math.abs(x - (other.x + ow));
    if (distL < bestDx) { bestDx = distL; sx = other.x + ow; snappedToId = other.id; snappedWall = 'left'; }
    const distR = Math.abs((x + dw) - other.x);
    if (distR < bestDx) { bestDx = distR; sx = other.x - dw; snappedToId = other.id; snappedWall = 'right'; }
  }

  let bestDy = threshold;
  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const oh = boundingSize(other).h;
    const distT = Math.abs(y - (other.y + oh));
    if (distT < bestDy) { bestDy = distT; sy = other.y + oh; snappedToId = other.id; snappedWall = 'top'; }
    const distB = Math.abs((y + dh) - other.y);
    if (distB < bestDy) { bestDy = distB; sy = other.y - dh; snappedToId = other.id; snappedWall = 'bottom'; }
  }

  return { x: sx, y: sy, snappedToId, snappedWall };
}
