import { SpecialRoomConfig } from './types';
import { RECT_WALL_INDEX } from './wallIndexConvention';

export const SCHOUW_CONFIG: SpecialRoomConfig = {
  type: 'schouw',
  label: 'Schouw',
  icon: '🔥',
  defaultLength: 1.5,
  defaultWidth: 0.6,
  defaultHeight: 2.4,
  minLength: 0.9,
  maxLength: 2.5,
  minWidth: 0.4,
  maxWidth: 1.2,
  placementModes: ['against-wall'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: RECT_WALL_INDEX.BOTTOM,
  description: 'Open haard of schoorsteenmantel',
};
