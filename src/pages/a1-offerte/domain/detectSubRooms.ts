import type { Room } from './roomTypes';
import {
  computeWallOffset,
  detectAttachedWall,
  isAdjacent,
  isOverlapping,
} from './spatial';
import { polygonArea } from './shape';

/**
 * Derives parent/child links and effectiveArea for special rooms from geometry.
 */
export function detectSubRooms(rooms: Room[]): Room[] {
  const normalRooms = rooms.filter(r => r.roomType === 'normal');
  let updated = rooms.map(r => {
    if (r.roomType === 'normal') return r;

    if (r.specialRoomPlacementMode === 'free') {
      return { ...r, parentRoomId: null, isSubRoom: false, attachedWall: null, wallOffset: undefined };
    }

    const parentCandidates = normalRooms;

    const preferWallAttach = r.specialRoomPlacementMode === 'inside' || r.specialRoomPlacementMode === 'outside' || r.specialRoomPlacementMode === undefined;

    if (preferWallAttach) {
      for (const parent of parentCandidates) {
        if (isAdjacent(r, parent)) {
          const wall = detectAttachedWall(r, parent);
          const wallOffset = (wall && wall !== 'inside') ? computeWallOffset(r, parent, wall) : undefined;
          if (wall && wall !== 'inside') {
            return { ...r, parentRoomId: parent.id, isSubRoom: true, attachedWall: wall, wallOffset };
          }
        }
      }
      for (const parent of parentCandidates) {
        if (isOverlapping(parent, r)) {
          const wall = detectAttachedWall(r, parent);
          const wallOffset = (wall && wall !== 'inside') ? computeWallOffset(r, parent, wall) : undefined;
          if (wall && wall !== 'inside') {
            return { ...r, parentRoomId: parent.id, isSubRoom: true, attachedWall: wall, wallOffset };
          }
        }
      }
    }

    for (const parent of parentCandidates) {
      if (isOverlapping(parent, r)) {
        return { ...r, parentRoomId: parent.id, isSubRoom: true, attachedWall: 'inside' as const, wallOffset: undefined };
      }
    }

    for (const parent of parentCandidates) {
      if (isAdjacent(r, parent)) {
        const wall = detectAttachedWall(r, parent);
        const wallOffset = (wall && wall !== 'inside') ? computeWallOffset(r, parent, wall) : undefined;
        return { ...r, parentRoomId: parent.id, isSubRoom: true, attachedWall: wall, wallOffset };
      }
    }

    return { ...r, parentRoomId: null, isSubRoom: false, attachedWall: null, wallOffset: undefined };
  });

  updated = updated.map(room => {
    const insideChildren = updated.filter(
      r => r.parentRoomId === room.id && r.attachedWall === 'inside',
    );
    const subtracted = insideChildren.reduce((sum, c) => sum + (c.vertices && c.vertices.length >= 3 ? polygonArea(c.vertices) : c.length * c.width), 0);
    const baseArea = room.vertices && room.vertices.length >= 3 ? polygonArea(room.vertices) : room.length * room.width;
    return { ...room, effectiveArea: baseArea - subtracted };
  });

  return updated;
}
