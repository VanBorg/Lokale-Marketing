import { PX_PER_M } from '../canvas/canvasTypes';
import type { AttachedWall, Room } from './roomTypes';
import { isSpecialRoom } from './specialRoomHelpers';

function roomBounds(room: Room) {
  let w: number;
  let h: number;
  if (room.vertices && room.vertices.length >= 3) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of room.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    w = (maxX - minX) * PX_PER_M;
    h = (maxY - minY) * PX_PER_M;
  } else {
    w = room.length * PX_PER_M;
    h = room.width * PX_PER_M;
  }
  return { left: room.x, top: room.y, right: room.x + w, bottom: room.y + h, w, h };
}

export function isOverlapping(container: Room, inner: Room): boolean {
  const c = roomBounds(container);
  const i = roomBounds(inner);
  const EPS = 2;
  return i.left >= c.left - EPS && i.top >= c.top - EPS
      && i.right <= c.right + EPS && i.bottom <= c.bottom + EPS;
}

const ADJACENCY_THRESHOLD_SPECIAL = 8;

export const ADJACENCY_THRESHOLD_FINALIZE = 52;

export function isAdjacent(roomA: Room, roomB: Room, threshold?: number): boolean {
  const t = threshold ?? (roomA.roomType !== 'normal' || roomB.roomType !== 'normal' ? ADJACENCY_THRESHOLD_SPECIAL : 20);
  const a = roomBounds(roomA);
  const b = roomBounds(roomB);

  const touchingHorizontally =
    Math.abs(a.right - b.left) <= t ||
    Math.abs(a.left - b.right) <= t;

  const touchingVertically =
    Math.abs(a.bottom - b.top) <= t ||
    Math.abs(a.top - b.bottom) <= t;

  const hasVerticalRange =
    a.top < b.bottom + t && a.bottom > b.top - t;

  const hasHorizontalRange =
    a.left < b.right + t && a.right > b.left - t;

  return (touchingHorizontally && hasVerticalRange) ||
         (touchingVertically && hasHorizontalRange);
}

export function getSpecialRoomsForParent(parent: Room, rooms: Room[]): Room[] {
  if (parent.roomType !== 'normal') return [];
  return rooms.filter(
    (room) =>
      room.id !== parent.id &&
      isSpecialRoom(room) &&
      (room.parentRoomId === parent.id ||
        isOverlapping(parent, room) ||
        isAdjacent(room, parent, ADJACENCY_THRESHOLD_FINALIZE))
  );
}

export function getDependentRoomsForFinalization(parent: Room, rooms: Room[]): Room[] {
  if (parent.roomType !== 'normal') return [];
  const childRooms = rooms.filter((room) => room.parentRoomId === parent.id);
  const specialRooms = getSpecialRoomsForParent(parent, rooms);
  const byId = new Map<string, Room>();
  childRooms.forEach((room) => byId.set(room.id, room));
  specialRooms.forEach((room) => byId.set(room.id, room));
  return Array.from(byId.values());
}

export function getAdjacentOrContainedRooms(parent: Room, rooms: Room[]): Room[] {
  return rooms.filter((room) => {
    if (room.id === parent.id) return false;
    const overlapsParent = isOverlapping(parent, room);
    const parentInsideRoom = isOverlapping(room, parent);
    const adjacent = isAdjacent(room, parent, ADJACENCY_THRESHOLD_FINALIZE);
    return overlapsParent || parentInsideRoom || adjacent || room.parentRoomId === parent.id;
  });
}

const ATTACH_WALL_THRESHOLD = 28;

export function detectAttachedWall(special: Room, normal: Room): AttachedWall {
  const s = roomBounds(special);
  const n = roomBounds(normal);
  const threshold = ATTACH_WALL_THRESHOLD;

  if (Math.abs(s.bottom - n.top) <= threshold) return 'top';
  if (Math.abs(s.top - n.bottom) <= threshold) return 'bottom';
  if (Math.abs(s.right - n.left) <= threshold) return 'left';
  if (Math.abs(s.left - n.right) <= threshold) return 'right';

  const dTop = Math.abs(s.bottom - n.top);
  const dBottom = Math.abs(s.top - n.bottom);
  const dLeft = Math.abs(s.right - n.left);
  const dRight = Math.abs(s.left - n.right);
  const min = Math.min(dTop, dBottom, dLeft, dRight);
  if (min === dTop) return 'top';
  if (min === dBottom) return 'bottom';
  if (min === dLeft) return 'left';
  return 'right';
}

export function computeWallOffset(special: Room, normal: Room, wall: AttachedWall): number {
  if (wall === 'inside' || wall === null) return 0;
  const s = roomBounds(special);
  const n = roomBounds(normal);
  if (wall === 'top' || wall === 'bottom') {
    const range = Math.max(0.001, n.w - s.w);
    const start = s.left - n.left;
    return Math.max(0, Math.min(1, start / range));
  }
  const range = Math.max(0.001, n.h - s.h);
  const start = s.top - n.top;
  return Math.max(0, Math.min(1, start / range));
}

export function positionSpecialOnWall(
  special: Room,
  parent: Room,
  wall: AttachedWall,
  wallOffset: number,
): { x: number; y: number } {
  const off = Math.max(0, Math.min(1, wallOffset));
  const n = roomBounds(parent);
  const s = roomBounds(special);
  const sw = s.w;
  const sh = s.h;
  switch (wall) {
    case 'top':
      return {
        x: n.left + off * (n.w - sw),
        y: n.top - sh,
      };
    case 'bottom':
      return {
        x: n.left + off * (n.w - sw),
        y: n.bottom,
      };
    case 'left':
      return {
        x: n.left - sw,
        y: n.top + off * (n.h - sh),
      };
    case 'right':
      return {
        x: n.right,
        y: n.top + off * (n.h - sh),
      };
    default:
      return { x: special.x, y: special.y };
  }
}
