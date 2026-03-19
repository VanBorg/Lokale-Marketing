import { SpecialRoomConfig } from './types';

export const NIS_CONFIG: SpecialRoomConfig = {
  type: 'nis',
  label: 'Nis',
  icon: '↩️',
  defaultLength: 1.5,
  defaultWidth: 0.4,
  defaultHeight: 2.4,
  minLength: 0.6,
  maxLength: 3.0,
  minWidth: 0.2,
  maxWidth: 1.0,
  placementModes: ['against-wall'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: 2,
  description: 'Uitsparing in de muur',
};
