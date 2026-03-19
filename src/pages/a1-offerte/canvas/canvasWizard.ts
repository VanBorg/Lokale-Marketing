import { Room, Vertex, ensureVertices, isSpecialRoomType, syncRoomFromVertices, verticesBoundingBox } from '../types';
import { PX_PER_M, WizardTarget, rotateVector2DDeg } from './canvasTypes';
import { computeWorldWallSegments } from './wallSegments';
import { getShapeConfig } from './shapes/index';

/* ── Constants ── */
const WIZARD_MIN_M = 0.05;
const WIZARD_MAX_M = 10;
const WIZARD_OFFSET_PX = 12;

/* ── Helpers ── */

function raycastToWall(
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  targetRoom: Room,
  maxDistPx: number,
): number | null {
  const segments = computeWorldWallSegments(targetRoom);
  let best: number | null = null;

  for (const seg of segments) {
    const sx = seg.p2.x - seg.p1.x;
    const sy = seg.p2.y - seg.p1.y;
    const rxs = dirX * sy - dirY * sx;
    if (Math.abs(rxs) < 1e-6) continue;

    const qpx = seg.p1.x - originX;
    const qpy = seg.p1.y - originY;
    const t = (qpx * sy - qpy * sx) / rxs;
    const u = (qpx * dirY - qpy * dirX) / rxs;

    if (t >= 0 && t <= maxDistPx && u >= 0 && u <= 1) {
      if (best === null || t < best) best = t;
    }
  }

  return best;
}

/* ── Wizard Targets: stepwise extend to collision ── */

export function detectWizardTargets(
  selectedRoom: Room,
  allRooms: Room[],
): WizardTarget[] {
  if (selectedRoom.isFinalized) return [];
  if (selectedRoom.roomType && isSpecialRoomType(selectedRoom.roomType)) {
    return [];
  }

  const targets: WizardTarget[] = [];
  const maxDistPx = WIZARD_MAX_M * PX_PER_M;
  const segments = computeWorldWallSegments(selectedRoom);

  const config = getShapeConfig(selectedRoom.shape);
  const innerWalls: Set<number> = new Set(
    Array.isArray(config.INNER_WALL_INDICES) ? config.INNER_WALL_INDICES : [],
  );

  for (const seg of segments) {
    if (innerWalls.has(seg.wallIndex)) continue;
    const originX = seg.midpoint.x;
    const originY = seg.midpoint.y;
    const dirX = seg.outwardNormal.x;
    const dirY = seg.outwardNormal.y;
    const nLen = Math.sqrt(dirX * dirX + dirY * dirY);
    if (nLen < 1e-6) continue;
    const normDirX = dirX / nLen;
    const normDirY = dirY / nLen;

    let bestDistPx: number | null = null;
    let bestRoomId: string | null = null;

    for (const other of allRooms) {
      if (other.id === selectedRoom.id) continue;
      if (!other.isFinalized) continue;

      const hit = raycastToWall(originX, originY, normDirX, normDirY, other, maxDistPx);
      if (hit === null) continue;
      if (bestDistPx === null || hit < bestDistPx) {
        bestDistPx = hit;
        bestRoomId = other.id;
      }
    }

    if (bestDistPx === null || !bestRoomId) continue;
    const distM = bestDistPx / PX_PER_M;
    if (distM <= WIZARD_MIN_M || distM >= WIZARD_MAX_M) continue;

    targets.push({
      roomId: selectedRoom.id,
      wallIndex: seg.wallIndex,
      direction: { nx: normDirX, ny: normDirY },
      targetDistance: distM,
      targetRoomId: bestRoomId,
      wizardWorldPos: {
        x: originX + normDirX * WIZARD_OFFSET_PX,
        y: originY + normDirY * WIZARD_OFFSET_PX,
      },
    });
  }

  return targets;
}

/* ── Wall extension ── */

type WizardFillResult = {
  vertices: Vertex[];
  x: number;
  y: number;
  length: number;
  width: number;
  wallLengths: Room['wallLengths'];
};

/**
 * Convert a local-space vertex to world-space pixels using the same
 * rotate-around-bbox-centre logic as {@link computeWorldWallSegments}.
 */
function localVertexToWorld(
  v: Vertex,
  allVerts: Vertex[],
  roomX: number,
  roomY: number,
  rotation: number,
): { x: number; y: number } {
  const bb = verticesBoundingBox(allVerts);
  const cx = bb.minX + bb.w / 2;
  const cy = bb.minY + bb.h / 2;
  const dx = v.x - cx;
  const dy = v.y - cy;
  const r = rotateVector2DDeg(dx, dy, rotation);
  return {
    x: roomX + (r.x + cx) * PX_PER_M,
    y: roomY + (r.y + cy) * PX_PER_M,
  };
}

export function applyWizardExtend(
  room: Room,
  target: WizardTarget,
): WizardFillResult {
  const verts = ensureVertices(room).map(v => ({ ...v }));
  const n = verts.length;
  const i1 = target.wallIndex;
  const i2 = (i1 + 1) % n;
  const rotation = room.rotation ?? 0;

  // Pick an anchor vertex that will NOT be moved — used to correct for
  // rotation-centre drift after the bounding box changes.
  const anchorIdx = findStableAnchor(n, i1, i2);
  const anchorBefore = localVertexToWorld(verts[anchorIdx], verts, room.x, room.y, rotation);

  const deltaM = target.targetDistance;
  const localDir = rotation === 0
    ? { x: target.direction.nx, y: target.direction.ny }
    : rotateVector2DDeg(target.direction.nx, target.direction.ny, -rotation);
  verts[i1].x += localDir.x * deltaM;
  verts[i1].y += localDir.y * deltaM;
  verts[i2].x += localDir.x * deltaM;
  verts[i2].y += localDir.y * deltaM;

  const minX = Math.min(...verts.map(v => v.x));
  const minY = Math.min(...verts.map(v => v.y));
  const normalized: Vertex[] = verts.map(v => ({
    x: parseFloat((v.x - minX).toFixed(4)),
    y: parseFloat((v.y - minY).toFixed(4)),
  }));

  const prelimX = room.x + minX * PX_PER_M;
  const prelimY = room.y + minY * PX_PER_M;

  // Compute where the anchor ends up with the new bbox centre, then
  // shift room position so it stays at its original world location.
  const anchorAfter = localVertexToWorld(normalized[anchorIdx], normalized, prelimX, prelimY, rotation);
  const correctedX = prelimX + (anchorBefore.x - anchorAfter.x);
  const correctedY = prelimY + (anchorBefore.y - anchorAfter.y);

  const synced = syncRoomFromVertices(normalized);
  return {
    vertices: normalized,
    x: correctedX,
    y: correctedY,
    length: synced.length,
    width: synced.width,
    wallLengths: synced.wallLengths,
  };
}

/** Pick a vertex index that is not part of the moved wall. */
function findStableAnchor(vertexCount: number, i1: number, i2: number): number {
  for (let i = 0; i < vertexCount; i++) {
    if (i !== i1 && i !== i2) return i;
  }
  return 0;
}

/* ── Post-extension collision detection ── */

type Pt = { x: number; y: number };

/**
 * Returns true if line segments (a1→a2) and (b1→b2) cross each other
 * (proper intersection only — shared endpoints are ignored via epsilon).
 */
function segmentsIntersect(a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean {
  const d1x = a2.x - a1.x, d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x, d2y = b2.y - b1.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / cross;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / cross;
  const EPS = 0.002;
  return t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS;
}

/**
 * Check whether any wall of the proposed room crosses any wall of the
 * other rooms.  Only detects proper crossings (not shared endpoints /
 * touching edges) so flush-snapped rooms do not trigger false positives.
 */
export function wizardResultCollides(
  proposedRoom: Room,
  otherRooms: Room[],
): boolean {
  const segs = computeWorldWallSegments(proposedRoom);
  for (const other of otherRooms) {
    if (other.id === proposedRoom.id) continue;
    const otherSegs = computeWorldWallSegments(other);
    for (const s of segs) {
      for (const os of otherSegs) {
        if (segmentsIntersect(s.p1, s.p2, os.p1, os.p2)) return true;
      }
    }
  }
  return false;
}

/**
 * Find the largest safe extension distance for a wizard target by binary
 * search.  Returns 0 if no safe distance exists.
 */
export function safeWizardDistance(
  room: Room,
  target: WizardTarget,
  allRooms: Room[],
): number {
  const others = allRooms.filter(r => r.id !== room.id);

  const fullResult = applyWizardExtend(room, target);
  const fullRoom: Room = { ...room, ...fullResult };
  if (!wizardResultCollides(fullRoom, others)) return target.targetDistance;

  let lo = 0;
  let hi = target.targetDistance;
  const STEPS = 12;
  const MIN_M = 0.02;

  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2;
    const testTarget: WizardTarget = { ...target, targetDistance: mid };
    const result = applyWizardExtend(room, testTarget);
    const testRoom: Room = { ...room, ...result };
    if (wizardResultCollides(testRoom, others)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return lo >= MIN_M ? lo : 0;
}
