/**
 * Barrel re-export – keeps all existing `from './canvasUtils'` imports working.
 *
 * The actual logic now lives in focused modules:
 *   canvasGeometry.ts  – clamp, boundingSize, grid, ghost, snap-highlight
 *   canvasSnapping.ts  – snapPosition, snapToRooms
 *   canvasResize.ts    – computeHandleDrag, computeVertexDrag
 *   canvasWizard.ts    – detectRoomGaps, computeWizardFill
 */

export { clamp, nearestWall, isNonRect, vertexBounds, quadBounds, boundingSize } from './canvasGeometry';
export type { GridLines } from './canvasGeometry';
export { computeGridLines, computeGhostPos, computeSnapHighlightRect } from './canvasGeometry';

export { snapPosition, snapToRooms } from './canvasSnapping';

export { computeHandleDrag, computeVertexDrag } from './canvasResize';

export { detectRoomGaps, computeWizardFill } from './canvasWizard';
