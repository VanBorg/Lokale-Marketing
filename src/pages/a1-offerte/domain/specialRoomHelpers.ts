import { SPECIAL_ROOM_TYPES } from './constants';
import type { Room, RoomFillKey, RoomType } from './roomTypes';

export function isSpecialRoomType(type: RoomType): boolean {
  return SPECIAL_ROOM_TYPES.has(type);
}

export function isSpecialRoom(room: Room): boolean {
  return isSpecialRoomType(room.roomType);
}

/** True when rotation is axis-aligned on the grid (0° / 90° / 180° / 270°). */
export function isSpecialRoomRechtRotation(rotationDeg: number | undefined | null): boolean {
  const n = (((Number(rotationDeg) || 0) % 360) + 360) % 360;
  const nearestQuarter = ((Math.round(n / 90) % 4) + 4) % 4 * 90;
  return Math.abs(n - nearestQuarter) < 1e-3;
}

export function getRoomFillKey(room: Room): RoomFillKey {
  if (room.isFinalized && isSpecialRoom(room)) return 'specialFinalizedFill';
  if (room.isSubRoom) return 'subRoomFill';
  return 'roomFill';
}
