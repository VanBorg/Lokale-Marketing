import { SpecialRoomConfig } from './types';
import { RECT_WALL_INDEX } from './wallIndexConvention';

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
  placementModes: ['inside', 'outside', 'free'],
  defaultPlacementMode: 'inside',
  canRotate: true,
  canPlaceOnDiagonalWall: true,
  preferredAttachmentWallIndex: RECT_WALL_INDEX.BOTTOM,
  description: 'Uitbouw aan de buitenmuur',
  wallRoles: ['exterior', 'exterior', 'attachment', 'exterior'],
  cornerSnapVertices: [2, 3],
};
