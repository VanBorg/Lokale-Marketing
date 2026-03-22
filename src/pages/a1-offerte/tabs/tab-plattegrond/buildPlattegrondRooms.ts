import {
  Room,
  RoomType,
  SHAPE_DEFAULTS,
  createDefaultWalls,
  createDefaultWallsCustomized,
  getShapeType,
  shapePointsToVertices,
  syncRoomFromVertices,
  normalizeVertices,
  polygonArea,
  verticesBoundingBox,
  ensureWallIds,
} from '../../types';
import { PX_PER_M } from '../../canvas/canvasTypes';
import { getSpecialRoomConfig } from '../../specialRooms';
import { nextKamerNumber } from './kamerCounter';

export function buildStandardShapeRoom(
  shape: string,
  roomCount: number,
  spawn: { x: number; y: number } | null | undefined,
): Room {
  const dims = SHAPE_DEFAULTS[shape] ?? { length: 4, width: 3 };
  const verts = shapePointsToVertices(shape, dims.length, dims.width);
  const x = spawn ? spawn.x - (dims.length * 40) / 2 : 50 + roomCount * 30;
  const y = spawn ? spawn.y - (dims.width * 40) / 2 : 50 + roomCount * 30;
  const n = nextKamerNumber();
  const id = crypto.randomUUID();
  const room: Room = {
    id,
    name: `Kamer${n}`,
    shape,
    shapeType: getShapeType(shape),
    rotation: 0,
    length: dims.length,
    width: dims.width,
    height: 2.6,
    x,
    y,
    elements: [],
    wallLengths: { top: dims.length, right: dims.width, bottom: dims.length, left: dims.width },
    vertices: verts,
    walls: createDefaultWalls(2.6),
    wallsCustomized: createDefaultWallsCustomized(),
    slopedCeiling: false,
    highestPoint: 2.6,
    ridgeCeiling: false,
    ridgeHeight: 2.6,
    isFinalized: false,
    tasks: [],
    roomType: 'normal',
    parentRoomId: null,
    isSubRoom: false,
    attachedWall: null,
    effectiveArea: dims.length * dims.width,
  };
  room.wallIds = ensureWallIds(room);
  return room;
}

export function buildFreeFormRoom(
  rawVertices: { x: number; y: number }[],
  roomCount: number,
  spawn: { x: number; y: number } | null | undefined,
): Room | null {
  if (rawVertices.length < 3) return null;
  const { vertices: normVerts } = normalizeVertices(rawVertices);
  const synced = syncRoomFromVertices(normVerts);
  const area = polygonArea(normVerts);
  const bb = verticesBoundingBox(normVerts);
  const defaultX = 50 + roomCount * 30;
  const defaultY = 50 + roomCount * 30;
  const pixelW = bb.w * PX_PER_M;
  const pixelH = bb.h * PX_PER_M;
  const x = spawn ? spawn.x - pixelW / 2 : defaultX;
  const y = spawn ? spawn.y - pixelH / 2 : defaultY;
  const n = nextKamerNumber();
  const freeId = crypto.randomUUID();
  const freeRoom: Room = {
    id: freeId,
    name: `Kamer${n}`,
    shape: 'vrije-vorm',
    shapeType: 'rect',
    rotation: 0,
    length: synced.length,
    width: synced.width,
    height: 2.6,
    x,
    y,
    elements: [],
    wallLengths: synced.wallLengths,
    vertices: normVerts,
    walls: createDefaultWalls(2.6),
    wallsCustomized: createDefaultWallsCustomized(),
    slopedCeiling: false,
    highestPoint: 2.6,
    ridgeCeiling: false,
    ridgeHeight: 2.6,
    isFinalized: false,
    tasks: [],
    roomType: 'normal',
    parentRoomId: null,
    isSubRoom: false,
    attachedWall: null,
    effectiveArea: area,
  };
  freeRoom.wallIds = ensureWallIds(freeRoom);
  return freeRoom;
}

export function buildSpecialTypeRoom(
  type: RoomType,
  name: string,
  length: number,
  width: number,
  roomCount: number,
  spawn: { x: number; y: number } | null | undefined,
  worldX?: number,
  worldY?: number,
): Room {
  const config = getSpecialRoomConfig(type);
  const resolvedLength = config?.defaultLength ?? length;
  const resolvedWidth = config?.defaultWidth ?? width;
  const resolvedHeight = config?.defaultHeight ?? 2.4;
  const hasCustomPos = worldX !== undefined && worldY !== undefined;
  const defaultX = 50 + roomCount * 30;
  const defaultY = 50 + roomCount * 30;
  const x = hasCustomPos
    ? worldX
    : spawn
      ? spawn.x - (resolvedLength * PX_PER_M) / 2
      : defaultX;
  const y = hasCustomPos
    ? worldY
    : spawn
      ? spawn.y - (resolvedWidth * PX_PER_M) / 2
      : defaultY;
  const specialId = crypto.randomUUID();
  const specialRoom: Room = {
    id: specialId,
    name,
    shape: 'rechthoek',
    shapeType: 'rect',
    rotation: 0,
    length: resolvedLength,
    width: resolvedWidth,
    height: resolvedHeight,
    x,
    y,
    elements: [],
    wallLengths: {
      top: resolvedLength,
      right: resolvedWidth,
      bottom: resolvedLength,
      left: resolvedWidth,
    },
    walls: createDefaultWalls(resolvedHeight),
    wallsCustomized: createDefaultWallsCustomized(),
    slopedCeiling: false,
    highestPoint: resolvedHeight,
    ridgeCeiling: false,
    ridgeHeight: resolvedHeight,
    isFinalized: false,
    tasks: [],
    roomType: type,
    parentRoomId: null,
    isSubRoom: false,
    attachedWall: null,
    effectiveArea: resolvedLength * resolvedWidth,
    specialRoomPlacementMode: config?.defaultPlacementMode ?? 'against-wall',
    wallRotationDeg: 0,
  };
  specialRoom.wallIds = ensureWallIds(specialRoom);
  return specialRoom;
}
