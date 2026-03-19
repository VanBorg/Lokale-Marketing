import { SpecialRoomConfig } from './types';

export const BADKAMER_CONFIG: SpecialRoomConfig = {
  type: 'badkamer',
  label: 'Badkamer',
  icon: '🚿',
  defaultLength: 2.5,
  defaultWidth: 2.0,
  defaultHeight: 2.4,
  minLength: 1.5,
  maxLength: 5.0,
  minWidth: 1.5,
  maxWidth: 4.0,
  placementModes: ['against-wall', 'inside-room'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: 2,
  description: 'Badkamer met douche of bad',
};
