import type { Room, RoomElement, Vertex } from '../types';

export const PX_PER_M = 40;
export const SNAP_THRESHOLD = 40;
/** Special rooms: only snap when very close to a wall so they stay freely placeable. */
export const SNAP_THRESHOLD_SPECIAL = 18;
export const SCALE_BY = 1.08;
export const MIN_SCALE = 0.15;
export const MAX_SCALE = 4;

export type WallId = 'top' | 'right' | 'bottom' | 'left';

export type SnapResult = {
  x: number;
  y: number;
  snappedToId?: string;
  snappedWall?: 'top' | 'right' | 'bottom' | 'left';
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

export type FacingEdgePair = {
  targetEdgeIdx: number;
  refEdgeIdx: number;
  gapPx: number;
  overlapPx: number;
  axis: 'x' | 'y';
  targetPos: number;
  refPos: number;
  overlapMin: number;
  overlapMax: number;
};

export type GapInfo = {
  roomId: string;
  referenceRoomId: string;
  gapAreaM2: number;
  wizardWorldPos: { x: number; y: number };
  edgePairs: FacingEdgePair[];
};

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
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}
