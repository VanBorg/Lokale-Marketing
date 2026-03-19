import { SpecialRoomConfig } from './types';

export const ERKER_CONFIG: SpecialRoomConfig = {
  type: 'erker',
  label: 'Erker',
  icon: '🪟',
  defaultLength: 2.0,
  defaultWidth: 1.0,
  defaultHeight: 2.4,
  minLength: 1.0,
  maxLength: 4.0,
  minWidth: 0.6,
  maxWidth: 2.0,
  placementModes: ['against-wall'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: true,
  preferredAttachmentWallIndex: 2,
  description: 'Uitbouw aan de buitenmuur',
};
