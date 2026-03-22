import { SpecialRoomConfig } from './types';
import { RECT_WALL_INDEX } from './wallIndexConvention';

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
  placementModes: ['inside', 'outside', 'free'],
  defaultPlacementMode: 'inside',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: RECT_WALL_INDEX.BOTTOM,
  description: 'Inpandige buitenruimte',
  wallRoles: ['exterior', 'exterior', 'attachment', 'exterior'],
  cornerSnapVertices: [2, 3],
};
