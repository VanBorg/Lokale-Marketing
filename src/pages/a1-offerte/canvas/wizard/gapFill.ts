import type { Room, Vertex } from '../../types';
import { ensureVertices, syncRoomFromVertices } from '../../types';
import { PX_PER_M, type GapInfo } from '../canvasTypes';
import { getWorldVertices, worldDeltaToLocal } from './worldSpace';

function findStableAnchor(vertexCount: number, i1: number, i2: number): number {
  for (let i = 0; i < vertexCount; i++) {
    if (i !== i1 && i !== i2) return i;
  }
  return 0;
}

export function computeWizardFill(targetRoom: Room, gap: GapInfo): Room | null {
  const verts = ensureVertices(targetRoom).map(v => ({ ...v }));
  const n = verts.length;
  if (n < 3) return null;

  const i1 = gap.wallIndex;
  if (i1 < 0 || i1 >= n) return null;
  const i2 = (i1 + 1) % n;
  const rotation = targetRoom.rotation ?? 0;

  const anchorIdx = findStableAnchor(n, i1, i2);
  const roomBefore: Room = { ...targetRoom, vertices: verts };
  const anchorBefore = getWorldVertices(roomBefore)[anchorIdx];

  const { dx, dy } = worldDeltaToLocal(gap.deltaPx.x, gap.deltaPx.y, rotation);
  verts[i1] = { x: verts[i1].x + dx, y: verts[i1].y + dy };
  verts[i2] = { x: verts[i2].x + dx, y: verts[i2].y + dy };

  const minX = Math.min(...verts.map(v => v.x));
  const minY = Math.min(...verts.map(v => v.y));
  const normalized: Vertex[] = verts.map(v => ({
    x: parseFloat((v.x - minX).toFixed(4)),
    y: parseFloat((v.y - minY).toFixed(4)),
  }));

  const prelimX = targetRoom.x + minX * PX_PER_M;
  const prelimY = targetRoom.y + minY * PX_PER_M;

  const roomPrelim: Room = { ...targetRoom, vertices: normalized, x: prelimX, y: prelimY };
  const anchorAfter = getWorldVertices(roomPrelim)[anchorIdx];
  const correctedX = prelimX + (anchorBefore.x - anchorAfter.x);
  const correctedY = prelimY + (anchorBefore.y - anchorAfter.y);

  const synced = syncRoomFromVertices(normalized);
  return {
    ...targetRoom,
    vertices: normalized,
    x: correctedX,
    y: correctedY,
    length: synced.length,
    width: synced.width,
    wallLengths: synced.wallLengths,
  };
}
