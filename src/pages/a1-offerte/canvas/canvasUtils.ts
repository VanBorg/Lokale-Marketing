/**
 * Barrel re-export – keeps all existing `from './canvasUtils'` imports working.
 *
 * The actual logic now lives in focused modules:
 *   canvasGeometry.ts  – clamp, boundingSize, grid, ghost, snap-highlight
 *   canvasSnapping.ts  – snapPosition, snapToRooms
 *   canvasResize.ts    – computeHandleDrag, computeVertexDrag
 *   canvasWizard.ts    – detectRoomGaps, computeWizardFill, safeGapFillDistance, getWorldVertices
 *   wallSegments.ts    – computeWorldWallSegments, getSnapCandidateSegments
 *   shapes/index.ts    – getShapeConfig
 */

export {
  clamp,
  nearestWall,
  isNonRect,
  vertexBounds,
  quadBounds,
  boundingSize,
  getRoomLabelCentreLocalPx,
} from './canvasGeometry';
export type { GridLines } from './canvasGeometry';
export { computeGridLines, computeGhostPos, computeSnapHighlightRect } from './canvasGeometry';

export { snapPosition, snapToRooms } from './canvasSnapping';

export { computeHandleDrag, computeVertexDrag } from './canvasResize';

export { detectRoomGaps, computeWizardFill, safeGapFillDistance, getWorldVertices } from './canvasWizard';

export { computeWorldWallSegments, getSnapCandidateSegments, rotateVector2D } from './wallSegments';
export type { WallSegment, ConnectZone } from './wallSegments';

export { getShapeConfig } from './shapes/index';
export type { ShapeConfig } from './shapes/index';
