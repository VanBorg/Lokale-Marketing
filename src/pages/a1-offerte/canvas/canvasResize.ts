import { Room, Vertex, ensureVertices, verticesBoundingBox, normalizeVertices, syncRoomFromVertices } from '../types';
import { HandleType, PX_PER_M } from './canvasTypes';

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
  let newX = startRoom.x;
  let newY = startRoom.y;

  const isEdge = handle === 'n' || handle === 's' || handle === 'e' || handle === 'w';
  if (isEdge) {
    if (handle === 'n') { addH = -dy * dM; newY = startRoom.y + rawDy; }
    else if (handle === 's') { addH = dy * dM; }
    else if (handle === 'e') { addW = dx * dM; }
    else { addW = -dx * dM; newX = startRoom.x + rawDx; }
  } else {
    if (handle === 'se') { addW = dx * dM; addH = dy * dM; }
    else if (handle === 'sw') { addW = -dx * dM; addH = dy * dM; newX = startRoom.x + rawDx; }
    else if (handle === 'ne') { addW = dx * dM; addH = -dy * dM; newY = startRoom.y + rawDy; }
    else { addW = -dx * dM; addH = -dy * dM; newX = startRoom.x + rawDx; newY = startRoom.y + rawDy; }
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

  return {
    x: newX, y: newY,
    wallLengths: synced.wallLengths,
    vertices: scaled,
    length: synced.length, width: synced.width,
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
