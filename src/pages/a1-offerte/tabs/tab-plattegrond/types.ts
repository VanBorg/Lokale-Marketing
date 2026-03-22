import type { Dispatch, SetStateAction } from 'react';
import type { Room, RoomElement, RoomType, Floor } from '../../types';

export type PlacingElement = { type: RoomElement['type']; width: number; height: number } | null;

export type PendingSpecialRoom = { type: RoomType; name: string; length: number; width: number };

export interface TabPlattegrondProps {
  floors: Floor[];
  setFloors: Dispatch<SetStateAction<Floor[]>>;
  /** Applies room list changes without recording undo history (derived sync only). */
  patchActiveFloorRoomsSilent: (updater: (rooms: Room[]) => Room[]) => void;
  activeFloorId: string;
  setActiveFloorId: Dispatch<SetStateAction<string>>;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;
  beginBatch: () => void;
  endBatch: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}
