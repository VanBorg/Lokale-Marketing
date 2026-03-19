import { SPECIAL_ROOM_CONFIGS } from './specialRooms';
import { PX_PER_M, rotateVector2DDeg } from './canvas/canvasTypes';

export type RoomElement = {
  id: string;
  type: 'deur' | 'raam' | 'schuifdeur' | 'openhaard' | 'radiator' | 'kolom' | 'badkuip' | 'toilet';
  width: number;
  height: number;
  wall: 'top' | 'right' | 'bottom' | 'left';
  position: number;
};

export type WallSide = {
  heightLeft: number;
  heightRight: number;
};

export type RoomWalls = {
  top: WallSide;
  right: WallSide;
  bottom: WallSide;
  left: WallSide;
};

export type RoomTask = {
  id: string;
  category: 'wanden' | 'plafond' | 'vloer' | 'overig';
  name: string;
  checked: boolean;
  detail?: string;
};

export type WallsCustomized = { top: boolean; right: boolean; bottom: boolean; left: boolean };

export type RoomType = 'normal' | 'wc' | 'badkamer' | 'kast' | 'berging' | 'doorgang' | 'logia' | 'plateau' | 'erker' | 'nis' | 'schouw' | 'trapgat' | 'balkon';

export type AttachedWall = 'top' | 'right' | 'bottom' | 'left' | 'inside' | null;

export type Vertex = { x: number; y: number };

export type Room = {
  id: string;
  name: string;
  shape: string;
  shapeType: 'rect';
  rotation: number;
  length: number;
  width: number;
  height: number;
  x: number;
  y: number;
  elements: RoomElement[];
  walls: RoomWalls;
  wallsCustomized: WallsCustomized;
  wallLengths: { top: number; right: number; bottom: number; left: number };
  vertices?: Vertex[];
  wallLocks?: boolean[];
  slopedCeiling: boolean;
  highestPoint: number;
  ridgeCeiling: boolean;
  ridgeHeight: number;
  isFinalized: boolean;
  tasks: RoomTask[];
  roomType: RoomType;
  parentRoomId: string | null;
  isSubRoom: boolean;
  attachedWall: AttachedWall;
  /** 0–1 position along the attached wall (when attachedWall is top/right/bottom/left). 0 = start, 1 = end. */
  wallOffset?: number;
  effectiveArea: number;
  specialRoomPlacementMode?: 'against-wall' | 'inside-room' | 'freestanding';
  wallRotationDeg?: number;
};

export type Floor = { id: string; name: string; rooms: Room[] };

export function createDefaultWalls(h: number): RoomWalls {
  const side = { heightLeft: h, heightRight: h };
  return { top: { ...side }, right: { ...side }, bottom: { ...side }, left: { ...side } };
}

export function createDefaultWallsCustomized(): WallsCustomized {
  return { top: false, right: false, bottom: false, left: false };
}

export const ROOM_TYPE_ICONS: Record<RoomType, string> = {
  normal: '',
  wc: '🚽',
  badkamer: '🚿',
  kast: '🗄️',
  berging: '📦',
  doorgang: '🚪',
  logia: '🏛️',
  plateau: '⬆️',
  erker: '🪟',
  nis: '↩️',
  schouw: '🔥',
  trapgat: '🪜',
  balkon: '🌤️',
};

export const SPECIAL_ROOMS = Object.values(SPECIAL_ROOM_CONFIGS).map(c => ({
  type: c.type as RoomType,
  label: c.label,
  length: c.defaultLength,
  width: c.defaultWidth,
}));

export const SPECIAL_ROOM_TYPES = new Set<RoomType>(SPECIAL_ROOMS.map((room) => room.type));

export function isSpecialRoomType(type: RoomType): boolean {
  return SPECIAL_ROOM_TYPES.has(type);
}

export function isSpecialRoom(room: Room): boolean {
  return isSpecialRoomType(room.roomType);
}

/** Canvas rotation (degrees) when a special room is "schuin" (diagonal on the plan). */
export const SPECIAL_ROOM_SCHUIN_ROTATION_DEG = 45;

/** True when rotation is axis-aligned on the grid (0° / 90° / 180° / 270°). */
export function isSpecialRoomRechtRotation(rotationDeg: number | undefined | null): boolean {
  const n = (((Number(rotationDeg) || 0) % 360) + 360) % 360;
  const nearestQuarter = ((Math.round(n / 90) % 4) + 4) % 4 * 90;
  return Math.abs(n - nearestQuarter) < 1e-3;
}

export type RoomFillKey = 'roomFill' | 'subRoomFill' | 'specialFinalizedFill';

export function getRoomFillKey(room: Room): RoomFillKey {
  if (room.isFinalized && isSpecialRoom(room)) return 'specialFinalizedFill';
  if (room.isSubRoom) return 'subRoomFill';
  return 'roomFill';
}

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

export const SHAPES = [
  { id: 'rechthoek', label: 'Rechthoek' },
  { id: 'l-vorm', label: 'L-vorm' },
  { id: 'boog', label: 'Omgekeerde L' },
  { id: 't-vorm', label: 'T-vorm' },
  { id: 'u-vorm', label: 'U-vorm' },
  { id: 'z-vorm', label: 'Z-vorm' },
  { id: 'z-vorm-inv', label: 'S-vorm (Z inv)' },
  { id: 'i-vorm', label: 'I-profiel' },
  { id: 'vrije-vorm', label: 'Vrij vorm' },
] as const;

export const SHAPE_DEFAULTS: Record<string, { length: number; width: number }> = {
  rechthoek: { length: 4, width: 3 },
  'l-vorm': { length: 4, width: 3 },
  'i-vorm': { length: 4, width: 3 },
  't-vorm': { length: 5, width: 4 },
  'u-vorm': { length: 5, width: 4 },
  boog: { length: 4, width: 3 },
  'z-vorm': { length: 5, width: 4 },
  'z-vorm-inv': { length: 5, width: 4 },
  'vrije-vorm': { length: 6, width: 6 },
};

export function getShapeType(_shape: string): Room['shapeType'] {
  return 'rect';
}

export function getShapePoints(shape: string, w: number, h: number): number[] {
  switch (shape) {
    case 'l-vorm':
      return [0, 0, w * 0.5, 0, w * 0.5, h * 0.5, w, h * 0.5, w, h, 0, h];
    case 'i-vorm': {
      const barH = h * 0.25;
      const stemW = w * 0.3;
      const sx = (w - stemW) / 2;
      const ex = sx + stemW;
      return [
        0, 0, w, 0, w, barH, ex, barH,
        ex, h - barH, w, h - barH, w, h,
        0, h, 0, h - barH, sx, h - barH,
        sx, barH, 0, barH,
      ];
    }
    case 't-vorm':
      return [
        0, 0, w, 0, w, h * 0.4, w * 0.67, h * 0.4,
        w * 0.67, h, w * 0.33, h, w * 0.33, h * 0.4, 0, h * 0.4,
      ];
    case 'u-vorm':
      return [
        0, 0, w * 0.33, 0, w * 0.33, h * 0.6,
        w * 0.67, h * 0.6, w * 0.67, 0, w, 0, w, h, 0, h,
      ];
    case 'boog':
      return [w * 0.5, 0, w, 0, w, h, w * 0.5, h, w * 0.5, h * 0.5, 0, h * 0.5, 0, 0];
    case 'z-vorm':
      // Z-shape: top arm left, straight centre bar, bottom arm right
      return [0, 0, w * 0.5, 0, w * 0.5, h * 0.4, w, h * 0.4, w, h, w * 0.5, h, w * 0.5, h * 0.6, 0, h * 0.6];
    case 'z-vorm-inv':
      // S-shape (inverted Z): top arm right, straight centre bar, bottom arm left
      return [w, 0, w * 0.5, 0, w * 0.5, h * 0.4, 0, h * 0.4, 0, h, w * 0.5, h, w * 0.5, h * 0.6, w, h * 0.6];
    case 'vrije-vorm':
      // Fallback when no vertices; normal flow uses room.vertices
      return [0, 0, w, 0, w, h, 0, h];
    case 'rechthoek':
    default:
      return [0, 0, w, 0, w, h, 0, h];
  }
}

/** Shoelace formula: area of closed polygon (vertices in order). */
export function polygonArea(vertices: Vertex[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

export const ELEMENT_DEFAULTS: Record<
  RoomElement['type'],
  { label: string; width: number; height: number }
> = {
  deur: { label: 'Deur', width: 1.0, height: 2.1 },
  raam: { label: 'Raam', width: 1.2, height: 1.2 },
  schuifdeur: { label: 'Schuifdeur', width: 2.1, height: 2.1 },
  openhaard: { label: 'Open haard', width: 1.2, height: 0.5 },
  radiator: { label: 'Radiator', width: 0.8, height: 0.2 },
  kolom: { label: 'Kolom', width: 0.3, height: 0.3 },
  badkuip: { label: 'Badkuip', width: 1.7, height: 0.8 },
  toilet: { label: 'Toilet', width: 0.4, height: 0.7 },
};

function roomBounds(room: Room) {
  const rotation = room.rotation || 0;
  let w: number;
  let h: number;
  if (rotation === 90 || rotation === 270) {
    w = room.width * PX_PER_M;
    h = room.length * PX_PER_M;
  } else {
    w = room.length * PX_PER_M;
    h = room.width * PX_PER_M;
  }
  const cx = w / 2;
  const cy = h / 2;
  const corners: [number, number][] = [[0, 0], [w, 0], [w, h], [0, h]];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of corners) {
    const { x: rx, y: ry } = rotateVector2DDeg(px - cx, py - cy, rotation);
    const wx = room.x + cx + rx;
    const wy = room.y + cy + ry;
    minX = Math.min(minX, wx);
    minY = Math.min(minY, wy);
    maxX = Math.max(maxX, wx);
    maxY = Math.max(maxY, wy);
  }
  return { left: minX, top: minY, right: maxX, bottom: maxY, w: maxX - minX, h: maxY - minY };
}

export function isOverlapping(container: Room, inner: Room): boolean {
  const c = roomBounds(container);
  const i = roomBounds(inner);
  const centerX = (i.left + i.right) / 2;
  const centerY = (i.top + i.bottom) / 2;
  return centerX > c.left && centerX < c.right && centerY > c.top && centerY < c.bottom;
}

/** Use a slightly larger threshold when a special room is next to a normal room (small rooms). */
const ADJACENCY_THRESHOLD_SPECIAL = 28;

/** Larger threshold for "belongs to this room" when finalizing (Badkamer, Berging, Trapgat, Logia etc.). */
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

/* ── Vertex helpers ───────────────────────────────────────────────── */

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
    // Simple rectangle: shift the diagonally-opposite vertex to maintain shape.
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
    // Orthogonal polygon (L, T, U, Z, S, I, …):
    // Ripple-propagate the delta forward through perpendicular walls until a
    // parallel wall can absorb the length change. Use the ORIGINAL vertices to
    // determine each segment's orientation so partially-updated positions don't
    // confuse the direction check.
    let curIdx = v2Idx;
    for (let step = 0; step < n - 2; step++) {
      const nextIdx = (curIdx + 1) % n;
      if (nextIdx === v1Idx) break; // would close back to the fixed anchor – stop

      const origDx = verts[nextIdx].x - verts[curIdx].x;
      const origDy = verts[nextIdx].y - verts[curIdx].y;
      const segIsVert = Math.abs(origDx) < 0.001;
      const segIsHoriz = Math.abs(origDy) < 0.001;

      if (isHoriz && segIsVert) {
        // Perpendicular (vertical) segment: shift its end vertex in X.
        out[nextIdx] = { x: out[nextIdx].x + deltaX, y: out[nextIdx].y };
        curIdx = nextIdx;
      } else if (isVert && segIsHoriz) {
        // Perpendicular (horizontal) segment: shift its end vertex in Y.
        out[nextIdx] = { x: out[nextIdx].x, y: out[nextIdx].y + deltaY };
        curIdx = nextIdx;
      } else {
        // Parallel segment — it absorbs the length change; stop here.
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

/** Pixel threshold for considering a special room attached to a normal room's wall. Slightly larger for small rooms. */
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

/**
 * Compute position-along-wall offset (0–1) for a special room attached to a normal room.
 * 0 = start of wall, 1 = end of wall (along the wall direction).
 */
export function computeWallOffset(special: Room, normal: Room, wall: AttachedWall): number {
  if (wall === 'inside' || wall === null) return 0;
  const s = roomBounds(special);
  const n = roomBounds(normal);
  if (wall === 'top' || wall === 'bottom') {
    const range = Math.max(0.001, n.w - s.w);
    const start = s.left - n.left;
    return Math.max(0, Math.min(1, start / range));
  }
  // left or right: offset along vertical wall
  const range = Math.max(0.001, n.h - s.h);
  const start = s.top - n.top;
  return Math.max(0, Math.min(1, start / range));
}

/**
 * Place a special room on its parent's wall using attachedWall and wallOffset.
 * Returns world x,y (top-left of the special room).
 */
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
