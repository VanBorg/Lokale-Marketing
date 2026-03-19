export type SpecialRoomPlacementMode =
  | 'against-wall'
  | 'inside-room'
  | 'freestanding';

export type SpecialRoomConfig = {
  type: string;
  label: string;
  icon: string;
  defaultLength: number;
  defaultWidth: number;
  defaultHeight: number;
  minLength: number;
  maxLength: number;
  minWidth: number;
  maxWidth: number;
  placementModes: SpecialRoomPlacementMode[];
  defaultPlacementMode: SpecialRoomPlacementMode;
  canRotate: boolean;
  canPlaceOnDiagonalWall: boolean;
  preferredAttachmentWallIndex: number;
  description: string;
};
