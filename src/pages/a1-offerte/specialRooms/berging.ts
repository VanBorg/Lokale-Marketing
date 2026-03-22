import { SpecialRoomConfig } from './types';
import { RECT_WALL_INDEX } from './wallIndexConvention';

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
  placementModes: ['inside', 'outside', 'free'],
  defaultPlacementMode: 'inside',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: RECT_WALL_INDEX.BOTTOM,
  description: 'Opslagruimte',
  wallRoles: ['free', 'free', 'attachment', 'free'],
  cornerSnapVertices: [2, 3],
};
