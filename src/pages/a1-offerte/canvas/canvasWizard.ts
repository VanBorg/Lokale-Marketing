import { Room, Vertex, ensureVertices, syncRoomFromVertices } from '../types';
import { PX_PER_M, GapInfo, FacingEdgePair } from './canvasTypes';

/* ── Constants ── */
const GAP_MAX_PX = 120;
const GAP_MIN_PX = 1;
const OVERLAP_MIN_PX = 2;

/* ── Types ── */
type WorldSegment = {
  wallIndex: number;
  x1: number; y1: number;
  x2: number; y2: number;
  isVertical: boolean;
  isHorizontal: boolean;
};

/* ── Helpers ── */

function isIShape(room: Room): boolean {
  return room.shape === 'i-vorm';
}

function getLocalBoundsPx(verts: Vertex[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of verts) {
    const x = v.x * PX_PER_M;
    const y = v.y * PX_PER_M;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function getRoomWorldSegments(room: Room): WorldSegment[] {
  const verts = ensureVertices(room);
  const segments: WorldSegment[] = [];
  const EPS = 0.5;
  const bounds = isIShape(room) ? getLocalBoundsPx(verts) : null;
  const minXWorld = bounds ? room.x + bounds.minX : 0;
  const maxXWorld = bounds ? room.x + bounds.maxX : 0;
  const minYWorld = bounds ? room.y + bounds.minY : 0;
  const maxYWorld = bounds ? room.y + bounds.maxY : 0;

  for (let i = 0; i < verts.length; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % verts.length];
    const x1 = room.x + v1.x * PX_PER_M;
    const y1 = room.y + v1.y * PX_PER_M;
    const x2 = room.x + v2.x * PX_PER_M;
    const y2 = room.y + v2.y * PX_PER_M;
    const isVertical = Math.abs((v2.x - v1.x) * PX_PER_M) < EPS;
    const isHorizontal = Math.abs((v2.y - v1.y) * PX_PER_M) < EPS;

    if (bounds) {
      if (isVertical && Math.abs(x1 - minXWorld) >= EPS && Math.abs(x1 - maxXWorld) >= EPS) continue;
      if (isHorizontal && Math.abs(y1 - minYWorld) >= EPS && Math.abs(y1 - maxYWorld) >= EPS) continue;
    }

    segments.push({
      wallIndex: i,
      x1,
      y1,
      x2,
      y2,
      isVertical,
      isHorizontal,
    });
  }
  return segments;
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

  const selSegments = getRoomWorldSegments(selectedRoom);
  const gaps: GapInfo[] = [];

  for (const other of allRooms) {
    if (other.id === selectedRoom.id) continue;
    // Normal rooms only use finalized rooms as references.
    if (!other.isFinalized) continue;

    const otherSegments = getRoomWorldSegments(other);
    const foundPairs: FacingEdgePair[] = [];

    for (const selSeg of selSegments) {
      for (const othSeg of otherSegments) {
        if (selSeg.isVertical && othSeg.isVertical) {
          const gap = Math.abs(selSeg.x1 - othSeg.x1);
          if (gap < GAP_MIN_PX || gap > GAP_MAX_PX) continue;

          const selMinY = Math.min(selSeg.y1, selSeg.y2);
          const selMaxY = Math.max(selSeg.y1, selSeg.y2);
          const othMinY = Math.min(othSeg.y1, othSeg.y2);
          const othMaxY = Math.max(othSeg.y1, othSeg.y2);
          const overlap = segmentOverlap(selMinY, selMaxY, othMinY, othMaxY);
          if (overlap < OVERLAP_MIN_PX) continue;

          foundPairs.push({
            targetEdgeIdx: selSeg.wallIndex,
            refEdgeIdx: othSeg.wallIndex,
            gapPx: gap,
            overlapPx: overlap,
            axis: 'x',
            targetPos: selSeg.x1,
            refPos: othSeg.x1,
            overlapMin: Math.max(selMinY, othMinY),
            overlapMax: Math.min(selMaxY, othMaxY),
          });
        }

        if (selSeg.isHorizontal && othSeg.isHorizontal) {
          const gap = Math.abs(selSeg.y1 - othSeg.y1);
          if (gap < GAP_MIN_PX || gap > GAP_MAX_PX) continue;

          const selMinX = Math.min(selSeg.x1, selSeg.x2);
          const selMaxX = Math.max(selSeg.x1, selSeg.x2);
          const othMinX = Math.min(othSeg.x1, othSeg.x2);
          const othMaxX = Math.max(othSeg.x1, othSeg.x2);
          const overlap = segmentOverlap(selMinX, selMaxX, othMinX, othMaxX);
          if (overlap < OVERLAP_MIN_PX) continue;

          foundPairs.push({
            targetEdgeIdx: selSeg.wallIndex,
            refEdgeIdx: othSeg.wallIndex,
            gapPx: gap,
            overlapPx: overlap,
            axis: 'y',
            targetPos: selSeg.y1,
            refPos: othSeg.y1,
            overlapMin: Math.max(selMinX, othMinX),
            overlapMax: Math.min(selMaxX, othMaxX),
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

    for (const [wallIdx, pairs] of Array.from(wallMap.entries())) {
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
