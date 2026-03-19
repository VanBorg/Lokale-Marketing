import {
  Room,
  Vertex,
  ensureVertices,
  verticesBoundingBox,
  normalizeVertices,
  syncRoomFromVertices,
} from '../types';
import { HandleType, PX_PER_M } from './canvasTypes';
import { rotateVector2D } from './wallSegments';

/** Same convention as {@link computeWorldWallSegments}: rotate vertex around bbox centre (metres). */
function rotatePointAroundCentreMetres(
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

/**
 * Pixel offset from `room.x` / `room.y` to the world position of point `(vx, vy)` in vertex metre space,
 * after rotating around the current vertex bounding-box centre (matches wall snapping / segments).
 */
function worldOffsetFromRoomOrigin(room: Room, vx: number, vy: number): { x: number; y: number } {
  const verts = ensureVertices(room);
  const bb = verticesBoundingBox(verts);
  const cxm = bb.minX + bb.w / 2;
  const cym = bb.minY + bb.h / 2;
  const rot = room.rotation ?? 0;
  const p = rot === 0 ? { x: vx, y: vy } : rotatePointAroundCentreMetres(vx, vy, cxm, cym, rot);
  return { x: p.x * PX_PER_M, y: p.y * PX_PER_M };
}

/** Vertex-space point that must stay fixed in world pixels while resizing from local origin (0,0). */
function getAnchorForHandle(
  handle: HandleType,
  bb: { minX: number; minY: number; maxX: number; maxY: number },
): { x: number; y: number } {
  const midX = (bb.minX + bb.maxX) / 2;
  const midY = (bb.minY + bb.maxY) / 2;
  switch (handle) {
    case 'n':
      return { x: midX, y: bb.maxY };
    case 's':
      return { x: midX, y: bb.minY };
    case 'e':
      return { x: bb.minX, y: midY };
    case 'w':
      return { x: bb.maxX, y: midY };
    case 'nw':
      return { x: bb.maxX, y: bb.maxY };
    case 'ne':
      return { x: bb.minX, y: bb.maxY };
    case 'sw':
      return { x: bb.maxX, y: bb.minY };
    case 'se':
      return { x: bb.minX, y: bb.minY };
    default:
      return { x: midX, y: midY };
  }
}

export function computeHandleDrag(
  handle: HandleType,
  startRoom: Room,
  rawDx: number,
  rawDy: number,
): { x: number; y: number; wallLengths: Room['wallLengths']; vertices?: Vertex[]; length: number; width: number } {
  const rot = startRoom.rotation || 0;
  const rad = -(rot * Math.PI) / 180;
  const dx = rawDx * Math.cos(rad) - rawDy * Math.sin(rad);
  const dy = rawDx * Math.sin(rad) + rawDy * Math.cos(rad);
  const dM = 1 / PX_PER_M;

  const verts = ensureVertices(startRoom);
  const bb = verticesBoundingBox(verts);
  const oldW = Math.max(bb.w, 0.1);
  const oldH = Math.max(bb.h, 0.1);

  let addW = 0;
  let addH = 0;

  const isEdge = handle === 'n' || handle === 's' || handle === 'e' || handle === 'w';
  if (isEdge) {
    if (handle === 'n') addH = -dy * dM;
    else if (handle === 's') addH = dy * dM;
    else if (handle === 'e') addW = dx * dM;
    else addW = -dx * dM;
  } else {
    if (handle === 'se') {
      addW = dx * dM;
      addH = dy * dM;
    } else if (handle === 'sw') {
      addW = -dx * dM;
      addH = dy * dM;
    } else if (handle === 'ne') {
      addW = dx * dM;
      addH = -dy * dM;
    } else {
      addW = -dx * dM;
      addH = -dy * dM;
    }
  }

  const newW = Math.max(0.1, oldW + addW);
  const newH = Math.max(0.1, oldH + addH);
  const scaleX = isEdge && (handle === 'n' || handle === 's') ? 1 : newW / oldW;
  const scaleY = isEdge && (handle === 'e' || handle === 'w') ? 1 : newH / oldH;

  const scaled: Vertex[] = verts.map(v => ({
    x: parseFloat((v.x * scaleX).toFixed(4)),
    y: parseFloat((v.y * scaleY).toFixed(4)),
  }));

  const synced = syncRoomFromVertices(scaled);

  const anchor = getAnchorForHandle(handle, bb);
  const ax1 = anchor.x * scaleX;
  const ay1 = anchor.y * scaleY;

  const tempRoomAfter: Room = {
    ...startRoom,
    vertices: scaled,
    length: synced.length,
    width: synced.width,
    wallLengths: synced.wallLengths,
  };

  const off0 = worldOffsetFromRoomOrigin(startRoom, anchor.x, anchor.y);
  const off1 = worldOffsetFromRoomOrigin(tempRoomAfter, ax1, ay1);

  const newX = startRoom.x + off0.x - off1.x;
  const newY = startRoom.y + off0.y - off1.y;

  return {
    x: newX,
    y: newY,
    wallLengths: synced.wallLengths,
    vertices: scaled,
    length: synced.length,
    width: synced.width,
  };
}

export function computeVertexDrag(
  startVertices: Vertex[],
  vertexIndex: number,
  dxMetres: number,
  dyMetres: number,
  startRoomX: number,
  startRoomY: number,
): { vertices: Vertex[]; x: number; y: number } & ReturnType<typeof syncRoomFromVertices> {
  const moved = startVertices.map(v => ({ ...v }));
  moved[vertexIndex] = {
    x: parseFloat((startVertices[vertexIndex].x + dxMetres).toFixed(4)),
    y: parseFloat((startVertices[vertexIndex].y + dyMetres).toFixed(4)),
  };

  const { vertices: norm, offsetX, offsetY } = normalizeVertices(moved);
  const synced = syncRoomFromVertices(norm);

  return {
    vertices: norm,
    x: startRoomX + offsetX * PX_PER_M,
    y: startRoomY + offsetY * PX_PER_M,
    ...synced,
  };
}
