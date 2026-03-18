import { Room, Vertex, ensureVertices } from '../types';
import { PX_PER_M, FacingEdgePair, GapInfo } from './canvasTypes';
import { boundingSize } from './canvasGeometry';

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
  const { w, h } = boundingSize(room);
  const cx = w / 2;
  const cy = h / 2;
  const rot = room.rotation || 0;
  const rad = (rot * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const edges: WorldEdge[] = [];
  const EPS = 0.5;

  for (let i = 0; i < verts.length; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % verts.length];
    const lx1 = v1.x * PX_PER_M, ly1 = v1.y * PX_PER_M;
    const lx2 = v2.x * PX_PER_M, ly2 = v2.y * PX_PER_M;
    const x1 = (lx1 - cx) * cosR - (ly1 - cy) * sinR + room.x + cx;
    const y1 = (lx1 - cx) * sinR + (ly1 - cy) * cosR + room.y + cy;
    const x2 = (lx2 - cx) * cosR - (ly2 - cy) * sinR + room.x + cx;
    const y2 = (lx2 - cx) * sinR + (ly2 - cy) * cosR + room.y + cy;

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

  const gaps: GapInfo[] = [];

  for (const ref of rooms) {
    if (ref.id === placedRoom.id || !ref.isFinalized) continue;

    const pairs = findFacingEdgePairs(placedRoom, ref);
    if (pairs.length === 0) continue;

    const groups = new Map<string, FacingEdgePair>();
    for (const pair of pairs) {
      const area = (pair.gapPx / PX_PER_M) * (pair.overlapPx / PX_PER_M);
      if (area < GAP_MIN_AREA) continue;

      const dir = pair.refPos > pair.targetPos ? '+' : '-';
      const key = `${pair.axis}-${dir}`;
      const existing = groups.get(key);
      if (!existing || pair.gapPx < existing.gapPx) {
        groups.set(key, pair);
      }
    }

    for (const pair of Array.from(groups.values())) {
      const area = (pair.gapPx / PX_PER_M) * (pair.overlapPx / PX_PER_M);
      const midPerp = (pair.targetPos + pair.refPos) / 2;
      const midPar = (pair.overlapMin + pair.overlapMax) / 2;
      const wizX = pair.axis === 'x' ? midPerp : midPar;
      const wizY = pair.axis === 'x' ? midPar : midPerp;

      gaps.push({
        roomId: placedRoom.id,
        referenceRoomId: ref.id,
        gapAreaM2: area,
        wizardWorldPos: { x: wizX, y: wizY },
        edgePairs: [pair],
      });
    }
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
  const pair = gap.edgePairs[0];
  if (!pair) return noChange(targetRoom);

  const deltaPx = pair.refPos - pair.targetPos;

  return {
    vertices: ensureVertices(targetRoom),
    x: pair.axis === 'x' ? targetRoom.x + deltaPx : targetRoom.x,
    y: pair.axis === 'y' ? targetRoom.y + deltaPx : targetRoom.y,
    length: targetRoom.length,
    width: targetRoom.width,
    wallLengths: { ...targetRoom.wallLengths },
  };
}
