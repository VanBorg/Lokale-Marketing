import { SpecialRoomConfig } from './types';

export const LOGIA_CONFIG: SpecialRoomConfig = {
  type: 'logia',
  label: 'Logia',
  icon: '🏛️',
  defaultLength: 3.0,
  defaultWidth: 1.5,
  defaultHeight: 2.4,
  minLength: 1.5,
  maxLength: 8.0,
  minWidth: 1.0,
  maxWidth: 4.0,
  placementModes: ['against-wall'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: 2,
  description: 'Inpandige buitenruimte',
};
