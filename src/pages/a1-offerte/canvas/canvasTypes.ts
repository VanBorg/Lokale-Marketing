import type { Room, RoomElement, Vertex } from '../types';

export const PX_PER_M = 40;

/**
 * Rotate a 2D vector by `rotationDeg` (degrees, same convention as Konva `Group.rotation` in this app).
 * Supports any angle (not only quarter-turns).
 */
export function rotateVector2DDeg(vx: number, vy: number, rotationDeg: number): { x: number; y: number } {
  const r = ((rotationDeg % 360) + 360) % 360;
  if (r === 0) return { x: vx, y: vy };
  const rad = (r * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: vx * c - vy * s, y: vx * s + vy * c };
}
export const SCALE_BY = 1.08;
export const MIN_SCALE = 0.15;
export const MAX_SCALE = 4;

export type WallId = 'top' | 'right' | 'bottom' | 'left';

export type SnapResult = {
  x: number;
  y: number;
  snappedToId?: string;
  /** Legacy axis-aligned value ('top'|'right'|'bottom'|'left') OR a stable wallId string from canvasWallSegments. */
  snappedWall?: string;
};

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type DraggingHandle = {
  roomId: string;
  handle: HandleType;
  startWorldPos: { x: number; y: number };
  startRoom: Room;
} | null;

export const HANDLE_CURSORS: Record<HandleType, string> = {
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
};

export type DraggingVertex = {
  roomId: string;
  vertexIndex: number;
  startWorldPos: { x: number; y: number };
  startVertices: Vertex[];
  startRoomPos: { x: number; y: number };
  startRotation: number;
} | null;

/** Mid-wall drag: both endpoints move along unit normal in vertex (metre) space. */
export type DraggingWall = {
  roomId: string;
  wallIndex: number;
  /** Unit normal in vertex space (perpendicular to wall, metres). */
  normalX: number;
  normalY: number;
  startWorldPos: { x: number; y: number };
  startVertices: Vertex[];
  startRoomPos: { x: number; y: number };
  startRotation: number;
} | null;

/** One facing axis-aligned edge pair between two rooms (world pixel space). */
export type FacingEdgePair = {
  roomAId: string;
  roomBId: string;
  wallIndexA: number;
  wallIndexB: number;
  gapPx: number;
  overlapPx: number;
  /** Full closure translation in world px for room A’s wall (scale by t for partial fill). */
  deltaPx: { x: number; y: number };
};

/** Wizard affordance for a gap from the selected room toward a reference room. */
export type GapInfo = {
  roomId: string;
  targetRoomId: string;
  wallIndex: number;
  refWallIndex: number;
  direction: { nx: number; ny: number };
  wizardWorldPos: { x: number; y: number };
  deltaPx: { x: number; y: number };
  /** Stable wallId of the wall being moved (from selectedRoom.wallIds). */
  wallIdTarget?: string;
  /** Stable wallId of the reference wall on the other room. */
  wallIdRef?: string;
  /** True when the fill is purely horizontal or vertical (no diagonal walls involved). */
  isRectangularFill?: boolean;
};

export type SnapResultWithInfo = SnapResult;

export interface PlattegrondCanvasProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
  selectedRoomIds?: Set<string>;
  onSelectedRoomIdsChange?: (ids: Set<string>) => void;
  onMoveRoom: (id: string, x: number, y: number) => void;
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
  onUpdateElement?: (roomId: string, elementId: string, updates: Partial<RoomElement>) => void;
  placingElement?: { type: RoomElement['type']; width: number; height: number } | null;
  onPlaceElement?: (roomId: string, wall: WallId, position: number) => void;
  onCancelPlacing?: () => void;
  selectedRoom?: Room | null;
  clipboard?: Room | null;
  isCut?: boolean;
  cutRoomId?: string | null;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onMoveRooms?: (moves: Array<{ id: string; x: number; y: number }>) => void;
  beginBatch?: () => void;
  endBatch?: () => void;
  selectedWallIndices?: number[];
  /** If true when the user would clear the selected room (canvas), canvas skips clearing and calls this so the parent can show a confirm dialog. */
  shouldConfirmClearRoomSelection?: () => boolean;
  onRequestClearRoomSelectionConfirm?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

// ─── Snap thresholds (shared across snapping modules) ─────────────────────────
export const SNAP_THRESHOLD = 40;
export const SNAP_THRESHOLD_SPECIAL = 50;

// ─── Segment snapping types ───────────────────────────────────────────────────

/** World-pixel representation of one wall edge, including outward normal. */
export type WallSegmentWorld = {
  roomId: string;
  wallIndex: number;
  v1: { x: number; y: number };
  v2: { x: number; y: number };
  length: number;
  midpoint: { x: number; y: number };
  /** Unit vector pointing away from room interior (world space). */
  outwardNormal: { x: number; y: number };
  isAttachment: boolean;
};

/** Result of a segment-based snap operation. */
export type CornerSnapResult = {
  x: number;
  y: number;
  snappedToId?: string;
  snappedWall?: string;
  snapType: 'corner-to-corner' | 'wall-to-wall' | 'bbox';
  matchedWallIndex?: number;
};
