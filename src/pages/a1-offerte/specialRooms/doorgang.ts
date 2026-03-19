import { SpecialRoomConfig } from './types';

export const DOORGANG_CONFIG: SpecialRoomConfig = {
  type: 'doorgang',
  label: 'Doorgang',
  icon: '🚪',
  defaultLength: 1.5,
  defaultWidth: 0.9,
  defaultHeight: 2.4,
  minLength: 0.9,
  maxLength: 3.0,
  minWidth: 0.6,
  maxWidth: 2.0,
  placementModes: ['against-wall'],
  defaultPlacementMode: 'against-wall',
  canRotate: true,
  canPlaceOnDiagonalWall: true,
  preferredAttachmentWallIndex: 2,
  description: 'Overgangsruimte of gang',
};
