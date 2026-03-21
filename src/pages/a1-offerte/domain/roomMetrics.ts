import type { Room, WallSide } from './roomTypes';
import { vertexWallLengths } from './vertices';

export function calcWallArea(wall: WallSide, wallWidth: number): number {
  return ((wall.heightLeft + wall.heightRight) / 2) * wallWidth;
}

export function calcTotalWalls(room: Room): number {
  if (room.vertices && room.vertices.length >= 3) {
    const lengths = vertexWallLengths(room.vertices);
    const h = room.height;
    return lengths.reduce((sum, len) => sum + len * h, 0);
  }
  const rotated = room.rotation === 90 || room.rotation === 270;
  const nsWidth = rotated ? room.width : room.length;
  const ewWidth = rotated ? room.length : room.width;
  return (
    calcWallArea(room.walls.top, nsWidth) +
    calcWallArea(room.walls.right, ewWidth) +
    calcWallArea(room.walls.bottom, nsWidth) +
    calcWallArea(room.walls.left, ewWidth)
  );
}
