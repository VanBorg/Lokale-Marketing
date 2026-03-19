import { SpecialRoomConfig } from './types';

export const KAST_CONFIG: SpecialRoomConfig = {
  type: 'kast',
  label: 'Kast',
  icon: '📦',
  defaultLength: 1.5,
  defaultWidth: 0.6,
  defaultHeight: 2.4,
  minLength: 0.6,
  maxLength: 4.0,
  minWidth: 0.4,
  maxWidth: 1.5,
  placementModes: ['against-wall'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: true,
  preferredAttachmentWallIndex: 2,
  description: 'Inbouwkast of walk-in closet',
};
