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

export type RoomFillKey = 'roomFill' | 'subRoomFill' | 'specialFinalizedFill';
