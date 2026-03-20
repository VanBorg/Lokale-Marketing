import type { Room } from '../../types';
import { ensureVertices, verticesBoundingBox } from '../../types';
import { PX_PER_M, rotateVector2DDeg } from '../canvasTypes';

function rotatePoint(
  vx: number,
  vy: number,
  cx: number,
  cy: number,
  rotation: number,
): { x: number; y: number } {
  const dx = vx - cx;
  const dy = vy - cy;
  const r = rotateVector2DDeg(dx, dy, rotation);
  return { x: r.x + cx, y: r.y + cy };
}

/** World-pixel polygon vertices; matches {@link computeWorldWallSegments} transform. */
export function getWorldVertices(room: Room): { x: number; y: number }[] {
  const localVerts = ensureVertices(room);
  if (localVerts.length < 3) return [];

  const bb = verticesBoundingBox(localVerts);
  const cx = bb.minX + bb.w / 2;
  const cy = bb.minY + bb.h / 2;
  const rotation = room.rotation ?? 0;

  const rotatedVerts =
    rotation === 0
      ? localVerts
      : localVerts.map(v => rotatePoint(v.x, v.y, cx, cy, rotation));

  return rotatedVerts.map(v => ({
    x: room.x + v.x * PX_PER_M,
    y: room.y + v.y * PX_PER_M,
  }));
}

/** World-space pixel delta → local metre delta (inverse of rotation applied to metre vectors). */
export function worldDeltaToLocal(dxPx: number, dyPx: number, rotation: number): { dx: number; dy: number } {
  const r = rotateVector2DDeg(dxPx / PX_PER_M, dyPx / PX_PER_M, -rotation);
  return { dx: r.x, dy: r.y };
}
