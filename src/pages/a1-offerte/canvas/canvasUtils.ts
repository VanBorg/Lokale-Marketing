import { Room, Vertex, getShapeType, computeQuadCorners, ensureVertices, verticesBoundingBox, normalizeVertices, syncRoomFromVertices } from '../types';
import { WallId, HandleType, SnapResult, PX_PER_M, SNAP_THRESHOLD, SNAP_THRESHOLD_SPECIAL } from './canvasTypes';

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function nearestWall(px: number, py: number, w: number, h: number): { wall: WallId; position: number } {
  const dTop = py;
  const dBottom = h - py;
  const dLeft = px;
  const dRight = w - px;
  const min = Math.min(dTop, dBottom, dLeft, dRight);

  if (min === dTop) return { wall: 'top', position: clamp(px / w, 0.05, 0.95) };
  if (min === dBottom) return { wall: 'bottom', position: clamp(px / w, 0.05, 0.95) };
  if (min === dLeft) return { wall: 'left', position: clamp(py / h, 0.05, 0.95) };
  return { wall: 'right', position: clamp(py / h, 0.05, 0.95) };
}

export function isNonRect(room: Room): boolean {
  if (room.vertices && room.vertices.length >= 3) {
    if (room.vertices.length !== 4) return true;
    for (let i = 0; i < 4; i++) {
      const a = room.vertices[i];
      const b = room.vertices[(i + 1) % 4];
      if (Math.abs(a.y - b.y) >= 0.001 && Math.abs(a.x - b.x) >= 0.001) return true;
    }
    return false;
  }
  const wl = room.wallLengths;
  if (!wl) return false;
  return wl.top !== wl.bottom || wl.left !== wl.right;
}

export function vertexBounds(room: Room): { w: number; h: number; pts: number[] } {
  const verts = ensureVertices(room);
  const bb = verticesBoundingBox(verts);
  const pts = verts.flatMap(v => [v.x * PX_PER_M, v.y * PX_PER_M]);
  return { w: bb.w * PX_PER_M, h: bb.h * PX_PER_M, pts };
}

export function quadBounds(room: Room): { w: number; h: number; pts: number[] } {
  if (room.vertices && room.vertices.length >= 3) {
    return vertexBounds(room);
  }
  const wl = room.wallLengths;
  const pts = computeQuadCorners(wl);
  let maxX = 0, maxY = 0;
  for (let i = 0; i < pts.length; i += 2) {
    maxX = Math.max(maxX, pts[i]);
    maxY = Math.max(maxY, pts[i + 1]);
  }
  return { w: maxX, h: maxY, pts };
}

export function boundingSize(room: Room): { w: number; h: number } {
  const shapeType = room.shapeType ?? getShapeType(room.shape);
  if (shapeType === 'circle') {
    const d = room.length * PX_PER_M;
    return { w: d, h: d };
  }
  if (shapeType === 'halfcircle') {
    const outerRadius = (room.length * PX_PER_M) / 2;
    return { w: outerRadius * 2, h: outerRadius };
  }
  if (room.vertices && room.vertices.length >= 3) {
    const bb = verticesBoundingBox(room.vertices);
    return { w: bb.w * PX_PER_M, h: bb.h * PX_PER_M };
  }
  if (shapeType === 'plus' || shapeType === 'ruit') {
    return { w: room.length * PX_PER_M, h: room.width * PX_PER_M };
  }
  if (shapeType === 'rect' && isNonRect(room)) {
    const { w, h } = quadBounds(room);
    return { w, h };
  }
  const rotated = room.rotation === 90 || room.rotation === 270;
  return {
    w: (rotated ? room.width : room.length) * PX_PER_M,
    h: (rotated ? room.length : room.width) * PX_PER_M,
  };
}

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

const GRID_SNAP_STEP = 80;

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

  const tryRoomSnapX = (): boolean => {
    let bestDx = threshold;
    for (const other of rooms) {
      if (other.id === draggedId) continue;
      const ow = boundingSize(other).w;
      if (walls.includes('left')) {
        const dist = Math.abs(x - (other.x + ow));
        if (dist < bestDx) {
          bestDx = dist;
          sx = other.x + ow;
          snappedToId = other.id;
          snappedWall = 'left';
        }
      }
      if (walls.includes('right')) {
        const dist = Math.abs((x + dw) - other.x);
        if (dist < bestDx) {
          bestDx = dist;
          sx = other.x - dw;
          snappedToId = other.id;
          snappedWall = 'right';
        }
      }
    }
    return bestDx < threshold;
  };

  const tryRoomSnapY = (): boolean => {
    let bestDy = threshold;
    for (const other of rooms) {
      if (other.id === draggedId) continue;
      const oh = boundingSize(other).h;
      if (walls.includes('top')) {
        const dist = Math.abs(y - (other.y + oh));
        if (dist < bestDy) {
          bestDy = dist;
          sy = other.y + oh;
          snappedToId = other.id;
          snappedWall = 'top';
        }
      }
      if (walls.includes('bottom')) {
        const dist = Math.abs((y + dh) - other.y);
        if (dist < bestDy) {
          bestDy = dist;
          sy = other.y - dh;
          snappedToId = other.id;
          snappedWall = 'bottom';
        }
      }
    }
    return bestDy < threshold;
  };

  const snapXToGrid = () => {
    if (walls.includes('left')) {
      sx = Math.round(x / GRID_SNAP_STEP) * GRID_SNAP_STEP;
    } else if (walls.includes('right')) {
      sx = Math.round((x + dw) / GRID_SNAP_STEP) * GRID_SNAP_STEP - dw;
    }
  };

  const snapYToGrid = () => {
    if (walls.includes('top')) {
      sy = Math.round(y / GRID_SNAP_STEP) * GRID_SNAP_STEP;
    } else if (walls.includes('bottom')) {
      sy = Math.round((y + dh) / GRID_SNAP_STEP) * GRID_SNAP_STEP - dh;
    }
  };

  const hasXWalls = walls.includes('left') || walls.includes('right');
  const hasYWalls = walls.includes('top') || walls.includes('bottom');

  if (hasXWalls) {
    if (!tryRoomSnapX()) snapXToGrid();
  }
  if (hasYWalls) {
    if (!tryRoomSnapY()) snapYToGrid();
  }

  if (!hasXWalls && !hasYWalls) {
    const dragEdges = getShapeSnapEdges(dragged);
    let bestDx = threshold, bestDy = threshold;
    for (const other of rooms) {
      if (other.id === draggedId) continue;
      const otherEdges = getShapeSnapEdges(other);
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

  return { x: sx, y: sy, snappedToId, snappedWall };
}

export type GridLines = { thin: { points: number[] }[]; thick: { points: number[] }[] };

export function computeGridLines(
  size: { width: number; height: number },
  stagePos: { x: number; y: number },
  scale: number,
): GridLines {
  if (!size.width || !size.height) return { thin: [], thick: [] };
  const thinStep = 80;
  const thickStep = 400;
  const x0 = Math.floor(-stagePos.x / scale / thinStep) * thinStep - thinStep;
  const y0 = Math.floor(-stagePos.y / scale / thinStep) * thinStep - thinStep;
  const x1 = x0 + size.width / scale + thinStep * 2;
  const y1 = y0 + size.height / scale + thinStep * 2;
  const thin: { points: number[] }[] = [];
  const thick: { points: number[] }[] = [];
  for (let x = Math.floor(x0 / thinStep) * thinStep; x <= x1; x += thinStep) {
    const pts = [x, y0, x, y1];
    if (x % thickStep === 0) thick.push({ points: pts }); else thin.push({ points: pts });
  }
  for (let y = Math.floor(y0 / thinStep) * thinStep; y <= y1; y += thinStep) {
    const pts = [x0, y, x1, y];
    if (y % thickStep === 0) thick.push({ points: pts }); else thin.push({ points: pts });
  }
  return { thin, thick };
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

  const verts = ensureVertices(startRoom);
  const bb = verticesBoundingBox(verts);
  const oldW = Math.max(bb.w, 0.1);
  const oldH = Math.max(bb.h, 0.1);
  const dM = 1 / PX_PER_M;

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

  return { x: newX, y: newY, wallLengths: synced.wallLengths, vertices: scaled, length: synced.length, width: synced.width };
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

export function computeGhostPos(
  room: Room,
  pointerX: number,
  pointerY: number,
  stageX: number,
  stageY: number,
  stageScaleX: number,
  stageScaleY: number,
): { wall: WallId; position: number } | null {
  const shapeType = room.shapeType ?? getShapeType(room.shape);
  const w = room.length * PX_PER_M;
  const h = shapeType === 'circle' ? w : room.width * PX_PER_M;
  const rot = room.rotation || 0;
  const rad = (rot * Math.PI) / 180;
  const worldX = (pointerX - stageX) / stageScaleX;
  const worldY = (pointerY - stageY) / stageScaleY;
  const dx = worldX - (room.x + w / 2);
  const dy = worldY - (room.y + h / 2);
  const localX = dx * Math.cos(-rad) - dy * Math.sin(-rad) + w / 2;
  const localY = dx * Math.sin(-rad) + dy * Math.cos(-rad) + h / 2;
  if (localX >= 0 && localX <= w && localY >= 0 && localY <= h) {
    return nearestWall(localX, localY, w, h);
  }
  return null;
}

export function computeSnapHighlightRect(
  rooms: Room[],
  snapHighlight: { roomId: string; wall: 'top' | 'right' | 'bottom' | 'left' },
): { x: number; y: number; w: number; h: number } | null {
  const target = rooms.find(r => r.id === snapHighlight.roomId);
  if (!target) return null;
  const { w: tw, h: th } = boundingSize(target);
  const wallThickness = 4;
  let hx = target.x, hy = target.y, hw = tw, hh = wallThickness;
  if (snapHighlight.wall === 'bottom') { hy = target.y + th - wallThickness; }
  if (snapHighlight.wall === 'left') { hw = wallThickness; hh = th; }
  if (snapHighlight.wall === 'right') { hx = target.x + tw - wallThickness; hw = wallThickness; hh = th; }
  return { x: hx, y: hy, w: hw, h: hh };
}
