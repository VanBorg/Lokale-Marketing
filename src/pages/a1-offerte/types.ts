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
  shapeType: 'rect' | 'circle' | 'halfcircle' | 'plus' | 'boog' | 'ruit';
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
  effectiveArea: number;
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
  kast: '📦',
  berging: '📁',
  doorgang: '🚪',
  logia: '🏛️',
  plateau: '⬆️',
  erker: '🪟',
  nis: '↩️',
  schouw: '🔥',
  trapgat: '🪜',
  balkon: '🌤️',
};

export const SPECIAL_ROOMS: { type: RoomType; label: string; length: number; width: number }[] = [
  { type: 'wc', label: 'WC', length: 1.2, width: 1.8 },
  { type: 'badkamer', label: 'Badkamer', length: 2.5, width: 2.0 },
  { type: 'doorgang', label: 'Doorgang', length: 1.0, width: 0.8 },
  { type: 'kast', label: 'Kast', length: 1.0, width: 0.6 },
  { type: 'berging', label: 'Berging', length: 2.0, width: 1.5 },
  { type: 'trapgat', label: 'Trapgat', length: 2.5, width: 1.0 },
  { type: 'erker', label: 'Erker', length: 2.0, width: 1.0 },
  { type: 'balkon', label: 'Balkon', length: 3.0, width: 1.2 },
  { type: 'nis', label: 'Nis', length: 0.8, width: 0.4 },
  { type: 'schouw', label: 'Schouw', length: 1.0, width: 0.6 },
  { type: 'plateau', label: 'Plateau', length: 2.0, width: 1.5 },
  { type: 'logia', label: 'Logia', length: 3.0, width: 1.5 },
];

export function calcWallArea(wall: WallSide, wallWidth: number): number {
  return ((wall.heightLeft + wall.heightRight) / 2) * wallWidth;
}

export function calcTotalWalls(room: Room): number {
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
  { id: 'langwerpig', label: 'Langwerpig' },
  { id: 'l-vorm', label: 'L-vorm' },
  { id: 'boog', label: 'Omgekeerde L' },
  { id: 't-vorm', label: 'T-vorm' },
  { id: 'u-vorm', label: 'U-vorm' },
  { id: 'z-vorm', label: 'Z-vorm' },
  { id: 'z-vorm-inv', label: 'S-vorm (Z inv)' },
  { id: 's-vorm', label: 'S-vorm' },
  { id: 's-vorm-inv', label: 'Omgekeerde S' },
  { id: 'i-vorm', label: 'I-profiel' },
  { id: 'trapezium', label: 'Trapezium' },
  { id: 'plus-vorm', label: 'Plus-vorm' },
  { id: 'vijfhoek', label: 'Vijfhoek' },
  { id: 'halve-cirkel', label: 'Halve cirkel' },
] as const;

export const SHAPE_DEFAULTS: Record<string, { length: number; width: number }> = {
  rechthoek: { length: 4, width: 3 },
  langwerpig: { length: 6, width: 2 },
  'l-vorm': { length: 4, width: 3 },
  'i-vorm': { length: 4, width: 3 },
  't-vorm': { length: 5, width: 4 },
  'u-vorm': { length: 5, width: 4 },
  trapezium: { length: 4, width: 3 },
  'plus-vorm': { length: 4, width: 4 },
  cirkel: { length: 4, width: 4 },
  'halve-cirkel': { length: 4, width: 2 },
  vijfhoek: { length: 4, width: 3 },
  boog: { length: 4, width: 3 },
  ruit: { length: 4, width: 4 },
  's-vorm': { length: 4, width: 4 },
  's-vorm-inv': { length: 4, width: 4 },
  'z-vorm': { length: 5, width: 4 },
  'z-vorm-inv': { length: 5, width: 4 },
};

export function getShapeType(shape: string): Room['shapeType'] {
  if (shape === 'cirkel') return 'circle';
  if (shape === 'halve-cirkel') return 'halfcircle';
  if (shape === 'plus-vorm') return 'plus';
  if (shape === 'boog') return 'rect';
  if (shape === 'ruit') return 'ruit';
  if (shape === 's-vorm' || shape === 's-vorm-inv') return 'rect';
  if (shape === 'z-vorm' || shape === 'z-vorm-inv') return 'rect';
  if (shape === 'vijfhoek') return 'rect';
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
    case 'trapezium':
      return [w * 0.15, 0, w * 0.85, 0, w, h, 0, h];
    case 'plus-vorm': {
      const tx = w / 3;
      const ty = h / 3;
      return [
        tx, 0, w - tx, 0,
        w - tx, ty, w, ty,
        w, h - ty, w - tx, h - ty,
        w - tx, h, tx, h,
        tx, h - ty, 0, h - ty,
        0, ty, tx, ty,
      ];
    }
    case 'vijfhoek': {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 * 0.9;
      const pts: number[] = [];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      return pts;
    }
    case 'ruit':
      return [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];
    case 'boog':
      return [w * 0.5, 0, w, 0, w, h, w * 0.5, h, w * 0.5, h * 0.5, 0, h * 0.5, 0, 0];
    case 's-vorm':
      return [0, h * 0.33, w * 0.5, h * 0.33, w * 0.5, 0, w, 0, w, h * 0.67, w * 0.5, h * 0.67, w * 0.5, h, 0, h];
    case 's-vorm-inv':
      return [0, 0, w * 0.5, 0, w * 0.5, h * 0.33, w, h * 0.33, w, h, w * 0.5, h, w * 0.5, h * 0.67, 0, h * 0.67];
    case 'z-vorm':
      // Z-shape: top arm left, straight centre bar, bottom arm right
      return [0, 0, w * 0.5, 0, w * 0.5, h * 0.4, w, h * 0.4, w, h, w * 0.5, h, w * 0.5, h * 0.6, 0, h * 0.6];
    case 'z-vorm-inv':
      // S-shape (inverted Z): top arm right, straight centre bar, bottom arm left
      return [w, 0, w * 0.5, 0, w * 0.5, h * 0.4, 0, h * 0.4, 0, h, w * 0.5, h, w * 0.5, h * 0.6, w, h * 0.6];
    case 'langwerpig':
    case 'rechthoek':
    default:
      return [0, 0, w, 0, w, h, 0, h];
  }
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

export const PX_PER_M = 40;

function roomBounds(room: Room) {
  const w = room.length * PX_PER_M;
  const h = room.width * PX_PER_M;
  return { left: room.x, top: room.y, right: room.x + w, bottom: room.y + h, w, h };
}

export function isOverlapping(container: Room, inner: Room): boolean {
  const c = roomBounds(container);
  const i = roomBounds(inner);
  return i.left >= c.left && i.top >= c.top && i.right <= c.right && i.bottom <= c.bottom;
}

export function isAdjacent(roomA: Room, roomB: Room, threshold: number = 5): boolean {
  const a = roomBounds(roomA);
  const b = roomBounds(roomB);

  const overlapX = a.left < b.right && a.right > b.left;
  const overlapY = a.top < b.bottom && a.bottom > b.top;

  if (overlapX && Math.abs(a.bottom - b.top) <= threshold) return true;
  if (overlapX && Math.abs(a.top - b.bottom) <= threshold) return true;
  if (overlapY && Math.abs(a.right - b.left) <= threshold) return true;
  if (overlapY && Math.abs(a.left - b.right) <= threshold) return true;

  return false;
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
  const isComplex = room.shape && room.shape !== 'rechthoek' && room.shape !== 'langwerpig'
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

  if (n === 4 && isRectangularVertices(verts)) {
    const oppositeIdx = (wallIndex + 2) % 4;
    const oppositeLocked = wallLocks?.[oppositeIdx] ?? false;

    if (!oppositeLocked) {
      const v3Idx = (wallIndex + 2) % 4;
      const isHorizontal = Math.abs(dy) < 0.001;
      if (isHorizontal) {
        out[v3Idx] = { x: out[v3Idx].x + deltaX, y: out[v3Idx].y };
      } else {
        out[v3Idx] = { x: out[v3Idx].x, y: out[v3Idx].y + deltaY };
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

export function detectAttachedWall(special: Room, normal: Room): AttachedWall {
  const s = roomBounds(special);
  const n = roomBounds(normal);

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
