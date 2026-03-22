import { Room, ensureVertices } from '../types';
import {
  PX_PER_M, SNAP_THRESHOLD_SPECIAL,
  WallSegmentWorld, CornerSnapResult, WallId,
} from './canvasTypes';
import { snapPosition } from './canvasSnapping';
import { computeWorldWallSegments } from './wallSegments';

// ---------------------------------------------------------------------------
// Legacy export: builds world segments WITHOUT applying room.rotation.
// Kept only for backwards-compat with any external consumers; prefer
// computeWorldWallSegments (wallSegments.ts) for new code.
// ---------------------------------------------------------------------------

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

/** @deprecated Ignores room.rotation — use computeWorldWallSegments instead. */
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

/**
 * Returns the world-pixel endpoints of the attachment wall at a hypothetical position,
 * correctly applying room.rotation so diagonal/rotated rooms work properly.
 */
export function getAttachmentWallWorldCoords(
  room: Room,
  wallIndex: number,
  atX: number,
  atY: number,
): { v1: { x: number; y: number }; v2: { x: number; y: number } } {
  // Use rotation-aware segment computation
  const segs = computeWorldWallSegments({ ...room, x: atX, y: atY });
  const seg = segs.find(s => s.wallIndex === wallIndex);
  if (seg) return { v1: seg.p1, v2: seg.p2 };

  // Fallback for degenerate cases (no segment found)
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

/**
 * Snaps a special room to another room's wall segments using rotation-aware geometry.
 * Falls back to bbox snap when no close wall is found.
 *
 * Two modes:
 *  - wall-to-wall: both endpoints of the attachment wall align with a host wall (same-length wall snap)
 *  - corner-to-corner: one endpoint of the attachment wall snaps to any host corner
 */
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

  // ── Dragged room: rotation-aware attachment wall ──────────────────────────
  const draggedSegs = computeWorldWallSegments({ ...dragged, x, y });
  const attachSeg = draggedSegs.find(s => s.wallIndex === attachmentWallIndex);

  // No attachment wall found (shouldn't happen for a valid rectangle)
  if (!attachSeg) {
    return { ...snapPosition(draggedId, x, y, rooms, activeWalls), snapType: 'bbox' };
  }

  const av1 = attachSeg.p1;
  const av2 = attachSeg.p2;
  const attachLen = attachSeg.lengthPx;
  const dragNormal = attachSeg.outwardNormal;

  let bestDist = threshold * 3;
  let bestResult: CornerSnapResult = { x, y, snapType: 'bbox' };

  for (const other of rooms) {
    if (other.id === draggedId) continue;
    // ── Host room: rotation-aware segments ──────────────────────────────────
    for (const seg of computeWorldWallSegments(other)) {
      const sv1 = seg.p1;
      const sv2 = seg.p2;

      // Wall-to-wall: try both endpoint alignments (forward and reversed)
      const wallCandidates = [
        [av1, sv1, av2, sv2],
        [av1, sv2, av2, sv1],
      ] as const;
      for (const [srcV, tgtV, otherEnd, chkV] of wallCandidates) {
        const ddx = tgtV.x - srcV.x;
        const ddy = tgtV.y - srcV.y;
        const projAv2x = otherEnd.x + ddx;
        const projAv2y = otherEnd.y + ddy;
        const dist2 = Math.sqrt((projAv2x - chkV.x) ** 2 + (projAv2y - chkV.y) ** 2);
        const normalDot = dragNormal.x * seg.outwardNormal.x + dragNormal.y * seg.outwardNormal.y;
        const lenDiff = Math.abs(attachLen - seg.lengthPx);
        if (dist2 < threshold && lenDiff < threshold && normalDot < -0.5) {
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

      // Corner-to-corner: snap av1 or av2 onto any segment endpoint.
      // Guard is mode-aware:
      //   outside placement → attachment wall faces INTO the host room → normals anti-parallel (dot < -0.5)
      //   inside  placement → attachment wall faces OUT of the host room → normals parallel (dot > 0.5)
      // Perpendicular normals (dot ≈ 0) are rejected. Parallel-but-wrong-mode walls
      // (e.g. the far wall of a different room) are also rejected by this split guard.
      const normalDotCorner = dragNormal.x * seg.outwardNormal.x + dragNormal.y * seg.outwardNormal.y;
      const isInsideMode = (dragged?.specialRoomPlacementMode ?? 'inside') !== 'outside';
      const cornerGuardPasses = isInsideMode ? normalDotCorner > 0.5 : normalDotCorner < -0.5;
      if (cornerGuardPasses) {
        for (const av of [av1, av2]) {
          for (const tv of [sv1, sv2]) {
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
  }

  if (bestResult.snapType === 'bbox') {
    return { ...snapPosition(draggedId, x, y, rooms, activeWalls), snapType: 'bbox' };
  }
  return bestResult;
}

