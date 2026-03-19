import { SpecialRoomConfig } from './types';

export const BERGING_CONFIG: SpecialRoomConfig = {
  type: 'berging',
  label: 'Berging',
  icon: '📁',
  defaultLength: 2.0,
  defaultWidth: 1.5,
  defaultHeight: 2.4,
  minLength: 1.0,
  maxLength: 6.0,
  minWidth: 0.9,
  maxWidth: 4.0,
  placementModes: ['against-wall', 'inside-room'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: 2,
  description: 'Opslagruimte',
};
