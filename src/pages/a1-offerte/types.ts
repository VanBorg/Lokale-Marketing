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

export type RoomType = 'normal' | 'wc' | 'badkamer' | 'kast' | 'berging';

export type AttachedWall = 'top' | 'right' | 'bottom' | 'left' | 'inside' | null;

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
};

export const SPECIAL_ROOMS: { type: RoomType; label: string; length: number; width: number }[] = [
  { type: 'wc', label: 'WC', length: 1.2, width: 1.8 },
  { type: 'badkamer', label: 'Badkamer', length: 2.5, width: 2.0 },
  { type: 'kast', label: 'Kast', length: 1.0, width: 0.6 },
  { type: 'berging', label: 'Berging', length: 2.0, width: 1.5 },
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
  { id: 'i-vorm', label: 'I-profiel' },
  { id: 't-vorm', label: 'T-vorm' },
  { id: 'u-vorm', label: 'U-vorm' },
  { id: 'trapezium', label: 'Trapezium' },
  { id: 'plus-vorm', label: 'Plus-vorm' },
  { id: 'boog', label: 'Boog' },
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
};

export function getShapeType(shape: string): Room['shapeType'] {
  if (shape === 'cirkel') return 'circle';
  if (shape === 'halve-cirkel') return 'halfcircle';
  if (shape === 'plus-vorm') return 'plus';
  if (shape === 'boog') return 'boog';
  if (shape === 'ruit') return 'ruit';
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
      return [0, 0, w, 0, w, h, 0, h];
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

  // TL is always at origin
  const tlX = 0, tlY = 0;
  // TR is always at (top, 0)
  const trX = top, trY = 0;

  if (top === bottom) {
    return [tlX, tlY, trX, trY, trX, right, tlX, left];
  }

  // For non-rectangular: solve BL position so left wall and bottom wall lengths are satisfied
  // BL = (blX, left), BR = (blX + bottom, brY)
  // left wall: sqrt(blX^2 + left^2) = left (already the height, so blX offset needed)
  // We place BL directly below TL offset to make left wall = left pixels tall
  // right wall: from TR to BR
  const blX = 0;
  const blY = left;
  const brX = bottom;
  // Right wall length must equal 'right' pixels, starting from TR
  // brY = sqrt(right^2 - (brX - trX)^2) but only if valid
  const dx = brX - trX;
  const rSq = right * right - dx * dx;
  if (rSq < 0) {
    // Geometry impossible, fall back to rectangle
    return [tlX, tlY, trX, trY, trX, right, tlX, left];
  }
  const brY = Math.sqrt(rSq);

  return [tlX, tlY, trX, trY, brX, brY, blX, blY];
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
