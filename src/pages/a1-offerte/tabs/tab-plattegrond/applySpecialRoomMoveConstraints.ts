import type { Room } from '../../types';
import { PX_PER_M } from '../../canvas/canvasTypes';

/**
 * Constrains drag position for special rooms (inside-room / against-wall modes).
 */
export function applySpecialRoomMoveConstraints(
  room: Room | undefined,
  prev: Room[],
  x: number,
  y: number,
): { finalX: number; finalY: number } {
  let finalX = x;
  let finalY = y;

  if (room?.specialRoomPlacementMode === 'inside') {
    const rot = room.rotation || 0;
    const rw = (rot === 90 || rot === 270 ? room.width : room.length) * PX_PER_M;
    const rh = (rot === 90 || rot === 270 ? room.length : room.width) * PX_PER_M;
    const cx = x + rw / 2;
    const cy = y + rh / 2;

    for (const parent of prev.filter(r => r.roomType === 'normal')) {
      const prot = parent.rotation || 0;
      const pw = (prot === 90 || prot === 270 ? parent.width : parent.length) * PX_PER_M;
      const ph = (prot === 90 || prot === 270 ? parent.length : parent.width) * PX_PER_M;
      const pl = parent.x;
      const pt = parent.y;
      const pr = parent.x + pw;
      const pb = parent.y + ph;

      if (cx > pl && cx < pr && cy > pt && cy < pb) {
        finalX = Math.max(pl, Math.min(pr - rw, x));
        finalY = Math.max(pt, Math.min(pb - rh, y));
        break;
      }
    }
  }

  if (room && (room.specialRoomPlacementMode === 'outside' || room.specialRoomPlacementMode === undefined) && room.parentRoomId) {
    const parent = prev.find(r => r.id === room.parentRoomId);
    if (parent && parent.roomType === 'normal') {
      const rot = room.rotation || 0;
      const rw = (rot === 90 || rot === 270 ? room.width : room.length) * PX_PER_M;
      const rh = (rot === 90 || rot === 270 ? room.length : room.width) * PX_PER_M;
      const bleed = 8;
      const minX = parent.x - bleed;
      const minY = parent.y - bleed;
      const maxX = parent.x + (parent.length * PX_PER_M) + bleed - rw;
      const maxY = parent.y + (parent.width * PX_PER_M) + bleed - rh;
      const outsideDist = Math.max(
        minX - finalX,
        finalX - maxX,
        minY - finalY,
        finalY - maxY,
        0,
      );
      const releaseDist = 64;
      if (outsideDist <= releaseDist) {
        finalX = Math.max(minX, Math.min(maxX, finalX));
        finalY = Math.max(minY, Math.min(maxY, finalY));
      }
    }
  }

  return { finalX, finalY };
}
