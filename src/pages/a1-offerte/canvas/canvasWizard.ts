import { Room, Vertex, ensureVertices, syncRoomFromVertices } from '../types';
import { PX_PER_M, GapInfo, FacingEdgePair } from './canvasTypes';
import { computeWorldWallSegments } from './wallSegments';

/* ── Constants ── */
const GAP_MAX_PX = 120;
const GAP_MIN_PX = 1;
const OVERLAP_MIN_PX = 2;

/* ── Types ── */
type WorldEdge = {
  idx: number;
  perpCoord: number;
  parallelMin: number;
  parallelMax: number;
  isVertical: boolean;
  facesPositive: boolean;
};

/* ── Helpers ── */

function buildWorldEdges(room: Room): WorldEdge[] {
  const segments = computeWorldWallSegments(room).filter(seg => seg.axis !== 'diagonal');
  return segments.map(seg => ({
    idx: seg.wallIndex,
    perpCoord: seg.axis === 'vertical' ? seg.p1.x : seg.p1.y,
    parallelMin: seg.axis === 'vertical'
      ? Math.min(seg.p1.y, seg.p2.y)
      : Math.min(seg.p1.x, seg.p2.x),
    parallelMax: seg.axis === 'vertical'
      ? Math.max(seg.p1.y, seg.p2.y)
      : Math.max(seg.p1.x, seg.p2.x),
    isVertical: seg.axis === 'vertical',
    facesPositive: seg.axis === 'vertical'
      ? seg.outwardNormal.x > 0
      : seg.outwardNormal.y > 0,
  }));
}

function segmentOverlap(
  aMin: number, aMax: number, bMin: number, bMax: number
): number {
  return Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
}

/* ── Gap Detection ── */

export function detectRoomGaps(
  selectedRoom: Room,
  allRooms: Room[],
): GapInfo[] {
  // Wizard is available only for editable normal rooms.
  if (selectedRoom.roomType !== 'normal') return [];
  if (selectedRoom.isFinalized) return [];

  const selEdges = buildWorldEdges(selectedRoom);
  const gaps: GapInfo[] = [];

  for (const other of allRooms) {
    if (other.id === selectedRoom.id) continue;
    // Normal rooms only use finalized rooms as references.
    if (!other.isFinalized) continue;

    const otherEdges = buildWorldEdges(other);
    const foundPairs: FacingEdgePair[] = [];

    for (const selEdge of selEdges) {
      for (const othEdge of otherEdges) {
        if (selEdge.isVertical && othEdge.isVertical) {
          const gap = Math.abs(selEdge.perpCoord - othEdge.perpCoord);
          if (gap < GAP_MIN_PX || gap > GAP_MAX_PX) continue;

          const overlap = segmentOverlap(
            selEdge.parallelMin, selEdge.parallelMax,
            othEdge.parallelMin, othEdge.parallelMax,
          );
          if (overlap < OVERLAP_MIN_PX) continue;

          foundPairs.push({
            targetEdgeIdx: selEdge.idx,
            refEdgeIdx: othEdge.idx,
            gapPx: gap,
            overlapPx: overlap,
            axis: 'x',
            targetPos: selEdge.perpCoord,
            refPos: othEdge.perpCoord,
            overlapMin: Math.max(selEdge.parallelMin, othEdge.parallelMin),
            overlapMax: Math.min(selEdge.parallelMax, othEdge.parallelMax),
          });
        }

        if (!selEdge.isVertical && !othEdge.isVertical) {
          const gap = Math.abs(selEdge.perpCoord - othEdge.perpCoord);
          if (gap < GAP_MIN_PX || gap > GAP_MAX_PX) continue;

          const overlap = segmentOverlap(
            selEdge.parallelMin, selEdge.parallelMax,
            othEdge.parallelMin, othEdge.parallelMax,
          );
          if (overlap < OVERLAP_MIN_PX) continue;

          foundPairs.push({
            targetEdgeIdx: selEdge.idx,
            refEdgeIdx: othEdge.idx,
            gapPx: gap,
            overlapPx: overlap,
            axis: 'y',
            targetPos: selEdge.perpCoord,
            refPos: othEdge.perpCoord,
            overlapMin: Math.max(selEdge.parallelMin, othEdge.parallelMin),
            overlapMax: Math.min(selEdge.parallelMax, othEdge.parallelMax),
          });
        }
      }
    }

    if (foundPairs.length === 0) continue;

    const wallMap = new Map<number, FacingEdgePair[]>();
    for (const pair of foundPairs) {
      const list = wallMap.get(pair.targetEdgeIdx) ?? [];
      list.push(pair);
      wallMap.set(pair.targetEdgeIdx, list);
    }

    for (const [, pairs] of Array.from(wallMap.entries())) {
      if (pairs.length === 0) continue;
      const closest = pairs.reduce(
        (best, p) => (p.gapPx < best.gapPx ? p : best),
        pairs[0]
      );

      const midPerp = (closest.targetPos + closest.refPos) / 2;
      const midPar = (closest.overlapMin + closest.overlapMax) / 2;
      const wizX = closest.axis === 'x' ? midPerp : midPar;
      const wizY = closest.axis === 'x' ? midPar : midPerp;

      const gapM2 = (closest.gapPx / PX_PER_M) * (closest.overlapPx / PX_PER_M);

      gaps.push({
        roomId: selectedRoom.id,
        referenceRoomId: other.id,
        gapAreaM2: gapM2,
        wizardWorldPos: { x: wizX, y: wizY },
        edgePairs: pairs,
      });
    }
  }

  return gaps;
}

/* ── Fill: move one wall to close the gap ── */

type WizardFillResult = {
  vertices: Vertex[];
  x: number;
  y: number;
  length: number;
  width: number;
  wallLengths: Room['wallLengths'];
};

function noChange(room: Room): WizardFillResult {
  return {
    vertices: ensureVertices(room),
    x: room.x,
    y: room.y,
    length: room.length,
    width: room.width,
    wallLengths: { ...room.wallLengths },
  };
}

export function computeWizardFill(
  targetRoom: Room,
  gap: GapInfo,
): WizardFillResult {
  if (gap.edgePairs.length === 0) return noChange(targetRoom);

  const verts = ensureVertices(targetRoom).map(v => ({ x: v.x, y: v.y }));
  const n = verts.length;

  const wallIndices = Array.from(
    gap.edgePairs.reduce((set, pair) => {
      set.add(pair.targetEdgeIdx);
      return set;
    }, new Set<number>())
  );
  const movedVertices = new Set<number>();

  for (const wallIdx of wallIndices) {
    const pairs = gap.edgePairs.filter(p => p.targetEdgeIdx === wallIdx);
    const best = pairs.reduce((a, b) => a.gapPx < b.gapPx ? a : b);

    const v1Idx = wallIdx;
    const v2Idx = (wallIdx + 1) % n;

    const deltaM = (best.refPos - best.targetPos) / PX_PER_M;

    if (best.axis === 'x') {
      if (!movedVertices.has(v1Idx)) {
        verts[v1Idx] = { x: verts[v1Idx].x + deltaM, y: verts[v1Idx].y };
        movedVertices.add(v1Idx);
      }
      if (!movedVertices.has(v2Idx)) {
        verts[v2Idx] = { x: verts[v2Idx].x + deltaM, y: verts[v2Idx].y };
        movedVertices.add(v2Idx);
      }
    } else {
      if (!movedVertices.has(v1Idx)) {
        verts[v1Idx] = { x: verts[v1Idx].x, y: verts[v1Idx].y + deltaM };
        movedVertices.add(v1Idx);
      }
      if (!movedVertices.has(v2Idx)) {
        verts[v2Idx] = { x: verts[v2Idx].x, y: verts[v2Idx].y + deltaM };
        movedVertices.add(v2Idx);
      }
    }
  }

  const minX = Math.min(...verts.map(v => v.x));
  const minY = Math.min(...verts.map(v => v.y));
  const normalized: Vertex[] = verts.map(v => ({
    x: parseFloat((v.x - minX).toFixed(4)),
    y: parseFloat((v.y - minY).toFixed(4)),
  }));

  const synced = syncRoomFromVertices(normalized);

  return {
    vertices: normalized,
    x: targetRoom.x + minX * PX_PER_M,
    y: targetRoom.y + minY * PX_PER_M,
    length: synced.length,
    width: synced.width,
    wallLengths: synced.wallLengths,
  };
}
