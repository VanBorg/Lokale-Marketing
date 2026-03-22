import { SpecialRoomConfig } from './types';

export const BALKON_CONFIG: SpecialRoomConfig = {
  type: 'balkon',
  label: 'Balkon',
  icon: '🌤️',
  defaultLength: 3.0,
  defaultWidth: 1.5,
  defaultHeight: 0,
  minLength: 1.5,
  maxLength: 8.0,
  minWidth: 0.9,
  maxWidth: 3.0,
  placementModes: ['inside', 'outside', 'free'],
  defaultPlacementMode: 'inside',
  canRotate: true,
  canPlaceOnDiagonalWall: true,
  preferredAttachmentWallIndex: 2,
  description: 'Buitenruimte aan de gevel',
  wallRoles: ['exterior', 'exterior', 'attachment', 'exterior'],
  cornerSnapVertices: [2, 3],
};
