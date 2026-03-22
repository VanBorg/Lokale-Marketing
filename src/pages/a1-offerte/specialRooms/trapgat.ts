import { SpecialRoomConfig } from './types';
import { RECT_WALL_INDEX } from './wallIndexConvention';

export const TRAPGAT_CONFIG: SpecialRoomConfig = {
  type: 'trapgat',
  label: 'Trapgat',
  icon: '🪜',
  defaultLength: 2.5,
  defaultWidth: 1.5,
  defaultHeight: 0,
  minLength: 1.5,
  maxLength: 4.0,
  minWidth: 0.9,
  maxWidth: 3.0,
  placementModes: ['inside-room', 'against-wall'],
  defaultPlacementMode: 'inside-room',
  canRotate: true,
  canPlaceOnDiagonalWall: false,
  preferredAttachmentWallIndex: RECT_WALL_INDEX.BOTTOM,
  description: 'Opening in de vloer voor een trap',
  wallRoles: ['free', 'free', 'attachment', 'free'],
  cornerSnapVertices: [2, 3],
};
