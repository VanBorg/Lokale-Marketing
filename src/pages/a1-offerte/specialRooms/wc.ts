import { SpecialRoomConfig } from './types';

export const WC_CONFIG: SpecialRoomConfig = {
  type: 'wc',
  label: 'WC',
  icon: '🚽',
  defaultLength: 1.2,
  defaultWidth: 1.5,
  defaultHeight: 2.4,
  minLength: 0.9,
  maxLength: 2.0,
  minWidth: 1.0,
  maxWidth: 2.5,
  placementModes: ['against-wall', 'inside-room'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: 2,
  description: 'Toilet ruimte, minimaal 0.9×1.0m',
};
