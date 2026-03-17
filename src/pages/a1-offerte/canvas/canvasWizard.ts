import { Room, Vertex, getShapeType, ensureVertices, syncRoomFromVertices } from '../types';
import { PX_PER_M, FacingEdgePair, GapInfo } from './canvasTypes';

/* ── Constants ──────────────────────────────────────────────────── */

const GAP_MAX_DIST = 120;
const GAP_MIN_DIST = 2;
const OVERLAP_MIN = 4;
const GAP_MIN_AREA = 0.01;

/* ── World-edge helpers ─────────────────────────────────────────── */

type WorldEdge = {
  idx: number;
  perpCoord: number;
  parallelMin: number;
  parallelMax: number;
  isVertical: boolean;
  facesPositive: boolean;
};

function polygonIsClockwise(verts: Vertex[]): boolean {
  let sum = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum > 0;
}

function buildWorldEdges(room: Room): WorldEdge[] {
  const verts = ensureVertices(room);
  const cw = polygonIsClockwise(verts);
  const ox = room.x;
  const oy = room.y;
  const edges: WorldEdge[] = [];
  const EPS = 0.5;

  for (let i = 0; i < verts.length; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % verts.length];
    const x1 = ox + v1.x * PX_PER_M;
    const y1 = oy + v1.y * PX_PER_M;
    const x2 = ox + v2.x * PX_PER_M;
    const y2 = oy + v2.y * PX_PER_M;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const isVert = Math.abs(dx) < EPS;
    const isHoriz = Math.abs(dy) < EPS;
    if (!isVert && !isHoriz) continue;

    if (isVert) {
      const facesPositive = cw ? dy > 0 : dy < 0;
      edges.push({
        idx: i,
        perpCoord: (x1 + x2) / 2,
        parallelMin: Math.min(y1, y2),
        parallelMax: Math.max(y1, y2),
        isVertical: true,
        facesPositive,
      });
    } else {
      const facesPositive = cw ? dx < 0 : dx > 0;
      edges.push({
        idx: i,
        perpCoord: (y1 + y2) / 2,
        parallelMin: Math.min(x1, x2),
        parallelMax: Math.max(x1, x2),
        isVertical: false,
        facesPositive,
      });
    }
  }

  return edges;
}

/* ── Core: find facing edge pairs ───────────────────────────────── */

function findFacingEdgePairs(target: Room, ref: Room): FacingEdgePair[] {
  const tEdges = buildWorldEdges(target);
  const rEdges = buildWorldEdges(ref);
  const pairs: FacingEdgePair[] = [];

  for (const te of tEdges) {
    for (const re of rEdges) {
      if (te.isVertical !== re.isVertical) continue;

      const oMin = Math.max(te.parallelMin, re.parallelMin);
      const oMax = Math.min(te.parallelMax, re.parallelMax);
      if (oMax - oMin < OVERLAP_MIN) continue;

      const gap = Math.abs(te.perpCoord - re.perpCoord);
      if (gap < GAP_MIN_DIST || gap > GAP_MAX_DIST) continue;

      const targetCloser = te.perpCoord < re.perpCoord;
      if (targetCloser) {
        if (!te.facesPositive || re.facesPositive) continue;
      } else {
        if (te.facesPositive || !re.facesPositive) continue;
      }

      pairs.push({
        targetEdgeIdx: te.idx,
        refEdgeIdx: re.idx,
        gapPx: gap,
        overlapPx: oMax - oMin,
        axis: te.isVertical ? 'x' : 'y',
        targetPos: te.perpCoord,
        refPos: re.perpCoord,
        overlapMin: oMin,
        overlapMax: oMax,
      });
    }
  }

  return pairs;
}

/* ── Gap detection ──────────────────────────────────────────────── */

export function detectRoomGaps(
  placedRoom: Room,
  rooms: Room[],
): GapInfo[] {
  if (placedRoom.isFinalized) return [];
  if ((placedRoom.rotation || 0) !== 0) return [];

  const placedST = placedRoom.shapeType ?? getShapeType(placedRoom.shape);
  if (placedST === 'circle' || placedST === 'halfcircle' || placedST === 'ruit') return [];

  const gaps: GapInfo[] = [];

  for (const ref of rooms) {
    if (ref.id === placedRoom.id || !ref.isFinalized) continue;
    if ((ref.rotation || 0) !== 0) continue;
    const refST = ref.shapeType ?? getShapeType(ref.shape);
    if (refST === 'circle' || refST === 'halfcircle' || refST === 'ruit') continue;

    const pairs = findFacingEdgePairs(placedRoom, ref);
    if (pairs.length === 0) continue;

    let gapArea = 0;
    for (const p of pairs) {
      gapArea += (p.gapPx / PX_PER_M) * (p.overlapPx / PX_PER_M);
    }
    if (gapArea < GAP_MIN_AREA) continue;

    let sumX = 0, sumY = 0, sumW = 0;
    for (const p of pairs) {
      const midPerp = (p.targetPos + p.refPos) / 2;
      const midPar = (p.overlapMin + p.overlapMax) / 2;
      const w = p.overlapPx;
      if (p.axis === 'x') {
        sumX += midPerp * w;
        sumY += midPar * w;
      } else {
        sumX += midPar * w;
        sumY += midPerp * w;
      }
      sumW += w;
    }

    gaps.push({
      roomId: placedRoom.id,
      referenceRoomId: ref.id,
      gapAreaM2: gapArea,
      wizardWorldPos: { x: sumX / sumW, y: sumY / sumW },
      edgePairs: pairs,
    });
  }

  return gaps;
}

/* ── Fill computation ───────────────────────────────────────────── */

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
    x: room.x, y: room.y,
    length: room.length, width: room.width,
    wallLengths: { ...room.wallLengths },
  };
}

export function computeWizardFill(
  targetRoom: Room,
  gap: GapInfo,
): WizardFillResult {
  const origVerts = ensureVertices(targetRoom);
  const verts = origVerts.map(v => ({ x: v.x, y: v.y }));
  const n = verts.length;

  if (gap.edgePairs.length === 0) return noChange(targetRoom);

  const dx: number[] = new Array(n).fill(0);
  const dy: number[] = new Array(n).fill(0);
  const dxSet: boolean[] = new Array(n).fill(false);
  const dySet: boolean[] = new Array(n).fill(false);

  for (const pair of gap.edgePairs) {
    const i1 = pair.targetEdgeIdx;
    const i2 = (i1 + 1) % n;
    const deltaM = (pair.refPos - pair.targetPos) / PX_PER_M;

    for (const i of [i1, i2]) {
      if (pair.axis === 'x') {
        const worldY = targetRoom.y + verts[i].y * PX_PER_M;
        if (worldY < pair.overlapMin - 1 || worldY > pair.overlapMax + 1) continue;
        if (!dxSet[i] || Math.abs(deltaM) < Math.abs(dx[i])) {
          dx[i] = deltaM;
          dxSet[i] = true;
        }
      } else {
        const worldX = targetRoom.x + verts[i].x * PX_PER_M;
        if (worldX < pair.overlapMin - 1 || worldX > pair.overlapMax + 1) continue;
        if (!dySet[i] || Math.abs(deltaM) < Math.abs(dy[i])) {
          dy[i] = deltaM;
          dySet[i] = true;
        }
      }
    }
  }

  let anyMoved = false;
  for (let i = 0; i < n; i++) {
    if (dx[i] !== 0 || dy[i] !== 0) anyMoved = true;
    verts[i].x = parseFloat((verts[i].x + dx[i]).toFixed(4));
    verts[i].y = parseFloat((verts[i].y + dy[i]).toFixed(4));
  }
  if (!anyMoved) return noChange(targetRoom);

  const minX = Math.min(...verts.map(v => v.x));
  const minY = Math.min(...verts.map(v => v.y));
  const normalised: Vertex[] = verts.map(v => ({
    x: parseFloat((v.x - minX).toFixed(4)),
    y: parseFloat((v.y - minY).toFixed(4)),
  }));

  const synced = syncRoomFromVertices(normalised);

  return {
    vertices: normalised,
    x: targetRoom.x + minX * PX_PER_M,
    y: targetRoom.y + minY * PX_PER_M,
    length: synced.length,
    width: synced.width,
    wallLengths: synced.wallLengths,
  };
}
