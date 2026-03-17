import { Room, Vertex, getShapeType, ensureVertices, verticesBoundingBox, normalizeVertices, syncRoomFromVertices } from '../types';
import { HandleType, PX_PER_M } from './canvasTypes';

export function computeHandleDrag(
  handle: HandleType,
  startRoom: Room,
  rawDx: number,
  rawDy: number,
): { x: number; y: number; wallLengths: Room['wallLengths']; vertices?: Vertex[]; length: number; width: number } {
  const shapeType = startRoom.shapeType ?? getShapeType(startRoom.shape);
  const rot = startRoom.rotation || 0;
  const rad = -(rot * Math.PI) / 180;
  const dx = rawDx * Math.cos(rad) - rawDy * Math.sin(rad);
  const dy = rawDx * Math.sin(rad) + rawDy * Math.cos(rad);
  const dM = 1 / PX_PER_M;

  if (shapeType === 'circle') {
    return computeCircleHandleDrag(handle, startRoom, dx, dy, dM);
  }
  if (shapeType === 'halfcircle') {
    return computeHalfcircleHandleDrag(handle, startRoom, dx, dy, dM);
  }

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

  const useVertices = shapeType === 'rect';
  return {
    x: newX, y: newY,
    wallLengths: synced.wallLengths,
    vertices: useVertices ? scaled : undefined,
    length: synced.length, width: synced.width,
  };
}

function computeCircleHandleDrag(
  handle: HandleType, startRoom: Room,
  dx: number, dy: number, dM: number,
): { x: number; y: number; wallLengths: Room['wallLengths']; length: number; width: number } {
  const oldD = startRoom.length;
  let addD = 0;

  switch (handle) {
    case 'e':  addD = dx * dM; break;
    case 'w':  addD = -dx * dM; break;
    case 's':  addD = dy * dM; break;
    case 'n':  addD = -dy * dM; break;
    case 'se': addD = Math.max(dx, dy) * dM; break;
    case 'sw': addD = Math.max(-dx, dy) * dM; break;
    case 'ne': addD = Math.max(dx, -dy) * dM; break;
    case 'nw': addD = Math.max(-dx, -dy) * dM; break;
  }

  const newD = Math.max(0.1, oldD + addD);
  const delta = (newD - oldD) * PX_PER_M;

  let newX = startRoom.x;
  let newY = startRoom.y;

  switch (handle) {
    case 'e':  newY = startRoom.y - delta / 2; break;
    case 'w':  newX = startRoom.x - delta; newY = startRoom.y - delta / 2; break;
    case 's':  newX = startRoom.x - delta / 2; break;
    case 'n':  newX = startRoom.x - delta / 2; newY = startRoom.y - delta; break;
    case 'sw': newX = startRoom.x - delta; break;
    case 'ne': newY = startRoom.y - delta; break;
    case 'nw': newX = startRoom.x - delta; newY = startRoom.y - delta; break;
  }

  const d = parseFloat(newD.toFixed(2));
  return {
    x: newX, y: newY, length: d, width: d,
    wallLengths: { top: d, right: d, bottom: d, left: d },
  };
}

function computeHalfcircleHandleDrag(
  handle: HandleType, startRoom: Room,
  dx: number, dy: number, dM: number,
): { x: number; y: number; wallLengths: Room['wallLengths']; length: number; width: number } {
  const oldD = startRoom.length;
  let addD = 0;

  switch (handle) {
    case 'e':  addD = dx * dM; break;
    case 'w':  addD = -dx * dM; break;
    case 's':  addD = dy * dM * 2; break;
    case 'n':  addD = -dy * dM * 2; break;
    case 'se': addD = Math.max(dx, dy * 2) * dM; break;
    case 'sw': addD = Math.max(-dx, dy * 2) * dM; break;
    case 'ne': addD = Math.max(dx, -dy * 2) * dM; break;
    case 'nw': addD = Math.max(-dx, -dy * 2) * dM; break;
  }

  const newD = Math.max(0.1, oldD + addD);
  const deltaW = (newD - oldD) * PX_PER_M;
  const deltaH = deltaW / 2;

  let newX = startRoom.x;
  let newY = startRoom.y;

  switch (handle) {
    case 'e':  newY = startRoom.y - deltaH / 2; break;
    case 'w':  newX = startRoom.x - deltaW; newY = startRoom.y - deltaH / 2; break;
    case 's':  newX = startRoom.x - deltaW / 2; break;
    case 'n':  newX = startRoom.x - deltaW / 2; newY = startRoom.y - deltaH; break;
    case 'sw': newX = startRoom.x - deltaW; break;
    case 'ne': newY = startRoom.y - deltaH; break;
    case 'nw': newX = startRoom.x - deltaW; newY = startRoom.y - deltaH; break;
  }

  const d = parseFloat(newD.toFixed(2));
  const r = parseFloat((newD / 2).toFixed(2));
  return {
    x: newX, y: newY, length: d, width: r,
    wallLengths: { top: d, right: r, bottom: d, left: r },
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
