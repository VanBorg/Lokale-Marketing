import { SpecialRoomConfig } from './types';
import { RECT_WALL_INDEX } from './wallIndexConvention';

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
  placementModes: ['inside', 'outside', 'free'],
  defaultPlacementMode: 'inside',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: RECT_WALL_INDEX.BOTTOM,
  description: 'Uitsparing in de muur',
  wallRoles: ['exterior', 'exterior', 'attachment', 'exterior'],
  cornerSnapVertices: [2, 3],
};
