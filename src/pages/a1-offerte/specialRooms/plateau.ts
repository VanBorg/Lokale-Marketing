import { SpecialRoomConfig } from './types';
import { RECT_WALL_INDEX } from './wallIndexConvention';

export const PLATEAU_CONFIG: SpecialRoomConfig = {
  type: 'plateau',
  label: 'Plateau',
  icon: '⬆️',
  defaultLength: 2.0,
  defaultWidth: 1.5,
  defaultHeight: 0.3,
  minLength: 1.0,
  maxLength: 6.0,
  minWidth: 1.0,
  maxWidth: 6.0,
  placementModes: ['inside-room', 'against-wall'],
  defaultPlacementMode: 'inside-room',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: RECT_WALL_INDEX.TOP,
  description: 'Verhoogd vloergedeelte',
};
