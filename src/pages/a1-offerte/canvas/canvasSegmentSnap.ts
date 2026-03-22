import { Room, ensureVertices } from '../types';
import {
  PX_PER_M, SNAP_THRESHOLD_SPECIAL,
  WallSegmentWorld, CornerSnapResult, WallId,
} from './canvasTypes';
import { snapPosition } from './canvasSnapping';

/** Returns true when polygon vertices wind clockwise (canvas Y-axis points down). */
function polygonWindingIsClockwise(verts: { x: number; y: number }[]): boolean {
  let sum = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return sum > 0;
}

/** Builds world-pixel wall segments for a room, including outward unit normals. */
export function getRoomWallSegments(
  room: Room,
  attachmentWallIndex?: number,
): WallSegmentWorld[] {
  const verts = ensureVertices(room);
  const n = verts.length;
  const isCW = polygonWindingIsClockwise(verts);
  const segments: WallSegmentWorld[] = [];
  for (let i = 0; i < n; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % n];
    const wx1 = room.x + v1.x * PX_PER_M;
    const wy1 = room.y + v1.y * PX_PER_M;
    const wx2 = room.x + v2.x * PX_PER_M;
    const wy2 = room.y + v2.y * PX_PER_M;
    const dx = wx2 - wx1;
    const dy = wy2 - wy1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) continue;
    // CW polygon in canvas-coords: (dy, -dx) points outward
    const nx = isCW ? dy / len : -dy / len;
    const ny = isCW ? -dx / len : dx / len;
    segments.push({
      roomId: room.id, wallIndex: i,
      v1: { x: wx1, y: wy1 }, v2: { x: wx2, y: wy2 },
      length: len,
      midpoint: { x: (wx1 + wx2) / 2, y: (wy1 + wy2) / 2 },
      outwardNormal: { x: nx, y: ny },
      isAttachment: i === attachmentWallIndex,
    });
  }
  return segments;
}

/** Returns world-pixel endpoints of the attachment wall at a hypothetical position. */
export function getAttachmentWallWorldCoords(
  room: Room,
  wallIndex: number,
  atX: number,
  atY: number,
): { v1: { x: number; y: number }; v2: { x: number; y: number } } {
  const verts = ensureVertices(room);
  const i2 = (wallIndex + 1) % verts.length;
  return {
    v1: { x: atX + verts[wallIndex].x * PX_PER_M, y: atY + verts[wallIndex].y * PX_PER_M },
    v2: { x: atX + verts[i2].x * PX_PER_M, y: atY + verts[i2].y * PX_PER_M },
  };
}

function segmentIndexToWallId(index: number): 'top' | 'right' | 'bottom' | 'left' {
  const map: Record<number, 'top' | 'right' | 'bottom' | 'left'> = {
    0: 'top', 1: 'right', 2: 'bottom', 3: 'left',
  };
  return map[index] ?? 'top';
}

/** Snaps a special room to another room's wall segments; falls back to bbox snap. */
export function snapPositionBySegment(
  draggedId: string,
  x: number,
  y: number,
  rooms: Room[],
  attachmentWallIndex?: number,
  activeWalls?: WallId[] | null,
): CornerSnapResult {
  if (attachmentWallIndex === undefined) {
    return { ...snapPosition(draggedId, x, y, rooms, activeWalls), snapType: 'bbox' };
  }
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return { x, y, snapType: 'bbox' };

  const threshold = SNAP_THRESHOLD_SPECIAL;
  const { v1: av1, v2: av2 } = getAttachmentWallWorldCoords(dragged, attachmentWallIndex, x, y);
  const attachLen = Math.sqrt((av2.x - av1.x) ** 2 + (av2.y - av1.y) ** 2);
  const dragSeg = getRoomWallSegments(dragged, attachmentWallIndex)
    .find(s => s.wallIndex === attachmentWallIndex);

  let bestDist = threshold * 3;
  let bestResult: CornerSnapResult = { x, y, snapType: 'bbox' };

  for (const other of rooms) {
    if (other.id === draggedId) continue;
    for (const seg of getRoomWallSegments(other)) {
      // Wall-to-wall: try both endpoint alignments (forward and reversed)
      const wallCandidates = [
        [av1, seg.v1, av2, seg.v2],
        [av1, seg.v2, av2, seg.v1],
      ] as const;
      for (const [srcV, tgtV, otherEnd, chkV] of wallCandidates) {
        const ddx = tgtV.x - srcV.x;
        const ddy = tgtV.y - srcV.y;
        const projAv2x = otherEnd.x + ddx;
        const projAv2y = otherEnd.y + ddy;
        const dist2 = Math.sqrt((projAv2x - chkV.x) ** 2 + (projAv2y - chkV.y) ** 2);
        const dot = dragSeg
          ? dragSeg.outwardNormal.x * seg.outwardNormal.x + dragSeg.outwardNormal.y * seg.outwardNormal.y
          : -1;
        const lenDiff = Math.abs(attachLen - seg.length);
        if (dist2 < threshold && lenDiff < threshold && dot < -0.5) {
          const total = Math.sqrt(ddx * ddx + ddy * ddy) + dist2;
          if (total < bestDist) {
            bestDist = total;
            bestResult = {
              x: x + ddx, y: y + ddy,
              snappedToId: other.id,
              snappedWall: segmentIndexToWallId(seg.wallIndex),
              snapType: 'wall-to-wall',
              matchedWallIndex: seg.wallIndex,
            };
          }
        }
      }

      // Corner-to-corner: snap av1 or av2 onto any segment endpoint
      for (const av of [av1, av2]) {
        for (const tv of [seg.v1, seg.v2]) {
          const ddx = tv.x - av.x;
          const ddy = tv.y - av.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < threshold && dist < bestDist) {
            bestDist = dist;
            bestResult = {
              x: x + ddx, y: y + ddy,
              snappedToId: other.id,
              snappedWall: segmentIndexToWallId(seg.wallIndex),
              snapType: 'corner-to-corner',
              matchedWallIndex: seg.wallIndex,
            };
          }
        }
      }
    }
  }

  if (bestResult.snapType === 'bbox') {
    return { ...snapPosition(draggedId, x, y, rooms, activeWalls), snapType: 'bbox' };
  }
  return bestResult;
}
