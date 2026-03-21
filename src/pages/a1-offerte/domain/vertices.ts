import { PX_PER_M } from '../canvas/canvasTypes';
import type { Room, Vertex } from './roomTypes';
import { getShapePoints, getShapeType } from './shape';

export function computeQuadCorners(wl: Room['wallLengths']): number[] {
  const top = wl.top * PX_PER_M;
  const right = wl.right * PX_PER_M;
  const bottom = wl.bottom * PX_PER_M;
  const left = wl.left * PX_PER_M;

  const tlX = 0, tlY = 0;
  const trX = top, trY = 0;

  if (top === bottom) {
    return [tlX, tlY, trX, trY, trX, right, tlX, left];
  }

  const blX = 0;
  const blY = left;
  const brX = bottom;
  const dx = brX - trX;
  const rSq = right * right - dx * dx;
  if (rSq < 0) {
    return [tlX, tlY, trX, trY, trX, right, tlX, left];
  }
  const brY = Math.sqrt(rSq);

  return [tlX, tlY, trX, trY, brX, brY, blX, blY];
}

export function shapePointsToVertices(shape: string, length: number, width: number): Vertex[] {
  const w = length * PX_PER_M;
  const h = width * PX_PER_M;
  const pts = getShapePoints(shape, w, h);
  const verts: Vertex[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    verts.push({
      x: parseFloat((pts[i] / PX_PER_M).toFixed(4)),
      y: parseFloat((pts[i + 1] / PX_PER_M).toFixed(4)),
    });
  }
  return verts;
}

export function ensureVertices(room: Room): Vertex[] {
  if (room.vertices && room.vertices.length >= 3) return room.vertices;

  const shapeType = room.shapeType ?? getShapeType(room.shape);
  const isComplex = room.shape && room.shape !== 'rechthoek'
    && shapeType === 'rect';
  if (isComplex) {
    return shapePointsToVertices(room.shape, room.length, room.width);
  }

  const wl = room.wallLengths ?? {
    top: room.length, right: room.width,
    bottom: room.length, left: room.width,
  };
  if (Math.abs(wl.top - wl.bottom) < 0.001 && Math.abs(wl.left - wl.right) < 0.001) {
    return [
      { x: 0, y: 0 },
      { x: wl.top, y: 0 },
      { x: wl.top, y: wl.right },
      { x: 0, y: wl.left },
    ];
  }
  const brX = wl.bottom;
  const dx = brX - wl.top;
  const rSq = wl.right * wl.right - dx * dx;
  if (rSq < 0) {
    return [
      { x: 0, y: 0 },
      { x: wl.top, y: 0 },
      { x: wl.top, y: wl.right },
      { x: 0, y: wl.left },
    ];
  }
  return [
    { x: 0, y: 0 },
    { x: wl.top, y: 0 },
    { x: brX, y: Math.sqrt(rSq) },
    { x: 0, y: wl.left },
  ];
}

export function vertexWallLengths(verts: Vertex[]): number[] {
  const n = verts.length;
  const lengths: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    lengths.push(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2));
  }
  return lengths;
}

export function verticesBoundingBox(verts: Vertex[]): {
  minX: number; minY: number; maxX: number; maxY: number; w: number; h: number;
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of verts) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function verticesToPoints(verts: Vertex[]): number[] {
  return verts.flatMap(v => [v.x * PX_PER_M, v.y * PX_PER_M]);
}

export function normalizeVertices(verts: Vertex[]): {
  vertices: Vertex[]; offsetX: number; offsetY: number;
} {
  const bb = verticesBoundingBox(verts);
  return {
    vertices: verts.map(v => ({
      x: parseFloat((v.x - bb.minX).toFixed(4)),
      y: parseFloat((v.y - bb.minY).toFixed(4)),
    })),
    offsetX: bb.minX,
    offsetY: bb.minY,
  };
}

export function insertVertex(verts: Vertex[], wallIndex: number): Vertex[] {
  const n = verts.length;
  const v1 = verts[wallIndex];
  const v2 = verts[(wallIndex + 1) % n];
  const mid: Vertex = {
    x: parseFloat(((v1.x + v2.x) / 2).toFixed(4)),
    y: parseFloat(((v1.y + v2.y) / 2).toFixed(4)),
  };
  const result = [...verts];
  result.splice(wallIndex + 1, 0, mid);
  return result;
}

function isRectangularVertices(verts: Vertex[]): boolean {
  if (verts.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % 4];
    if (Math.abs(a.y - b.y) >= 0.001 && Math.abs(a.x - b.x) >= 0.001) return false;
  }
  return true;
}

export function updateVertexWallLength(
  verts: Vertex[],
  wallIndex: number,
  newLength: number,
  wallLocks?: boolean[],
): { vertices: Vertex[]; offsetX: number; offsetY: number } {
  const n = verts.length;
  const v1Idx = wallIndex;
  const v2Idx = (wallIndex + 1) % n;
  const v1 = verts[v1Idx];
  const v2 = verts[v2Idx];

  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const curLen = Math.sqrt(dx * dx + dy * dy);
  if (curLen < 0.001) return { vertices: [...verts], offsetX: 0, offsetY: 0 };

  const dirX = dx / curLen;
  const dirY = dy / curLen;
  const newV2x = v1.x + dirX * newLength;
  const newV2y = v1.y + dirY * newLength;
  const deltaX = newV2x - v2.x;
  const deltaY = newV2y - v2.y;

  const out = verts.map(v => ({ ...v }));
  out[v2Idx] = { x: newV2x, y: newV2y };

  const isHoriz = Math.abs(dy) < 0.001;
  const isVert = Math.abs(dx) < 0.001;

  if (n === 4 && isRectangularVertices(verts)) {
    const oppositeIdx = (wallIndex + 2) % 4;
    if (!(wallLocks?.[oppositeIdx] ?? false)) {
      const v3Idx = (wallIndex + 2) % 4;
      if (isHoriz) {
        out[v3Idx] = { x: out[v3Idx].x + deltaX, y: out[v3Idx].y };
      } else {
        out[v3Idx] = { x: out[v3Idx].x, y: out[v3Idx].y + deltaY };
      }
    }
  } else if (n > 4 && (isHoriz || isVert)) {
    let curIdx = v2Idx;
    for (let step = 0; step < n - 2; step++) {
      const nextIdx = (curIdx + 1) % n;
      if (nextIdx === v1Idx) break;

      const origDx = verts[nextIdx].x - verts[curIdx].x;
      const origDy = verts[nextIdx].y - verts[curIdx].y;
      const segIsVert = Math.abs(origDx) < 0.001;
      const segIsHoriz = Math.abs(origDy) < 0.001;

      if (isHoriz && segIsVert) {
        out[nextIdx] = { x: out[nextIdx].x + deltaX, y: out[nextIdx].y };
        curIdx = nextIdx;
      } else if (isVert && segIsHoriz) {
        out[nextIdx] = { x: out[nextIdx].x, y: out[nextIdx].y + deltaY };
        curIdx = nextIdx;
      } else {
        break;
      }
    }
  }

  return normalizeVertices(out);
}

export function syncRoomFromVertices(verts: Vertex[]): {
  length: number;
  width: number;
  wallLengths: { top: number; right: number; bottom: number; left: number };
} {
  const bb = verticesBoundingBox(verts);
  const lengths = vertexWallLengths(verts);
  return {
    length: parseFloat(bb.w.toFixed(2)),
    width: parseFloat(bb.h.toFixed(2)),
    wallLengths: {
      top: parseFloat((lengths[0] ?? bb.w).toFixed(2)),
      right: parseFloat((lengths[1] ?? bb.h).toFixed(2)),
      bottom: parseFloat((lengths[2] ?? bb.w).toFixed(2)),
      left: parseFloat((lengths[3] ?? bb.h).toFixed(2)),
    },
  };
}
