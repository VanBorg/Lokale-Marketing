import type { Room, Vertex } from '../types';
import { ensureVertices, syncRoomFromVertices, verticesBoundingBox, isSpecialRoomType, ensureWallIds } from '../types';
import { PX_PER_M, rotateVector2DDeg, type GapInfo, type CornerFillInfo } from './canvasTypes';
import { polygonIsClockwise } from './wallSegments';
import { buildWallSegmentsEx, getAllRoomCorners, type RoomCorner } from './canvasWallSegments';

const GAP_MAX_PX = 120;
const GAP_MIN_PX = 1;
const OVERLAP_MIN_PX = 8;
const UNSUPPORTED = new Set(['cirkel', 'halfcircle', 'halfcirkel', 'ruit', 'diamant']);

type WorldEdge = {
  wallIndex: number;
  perpCoord: number;
  parallelMin: number;
  parallelMax: number;
  isVertical: boolean;
  facesPositive: boolean;
};

export function getWorldVertices(room: Room): { x: number; y: number }[] {
  const lv = ensureVertices(room);
  if (lv.length < 3) return [];
  const bb = verticesBoundingBox(lv);
  const cx = bb.minX + bb.w / 2;
  const cy = bb.minY + bb.h / 2;
  const rot = room.rotation ?? 0;
  const rv = rot === 0 ? lv : lv.map(v => {
    const r = rotateVector2DDeg(v.x - cx, v.y - cy, rot);
    return { x: r.x + cx, y: r.y + cy };
  });
  return rv.map(v => ({ x: room.x + v.x * PX_PER_M, y: room.y + v.y * PX_PER_M }));
}

function worldDeltaToLocal(dxPx: number, dyPx: number, rotation: number) {
  const r = rotateVector2DDeg(dxPx / PX_PER_M, dyPx / PX_PER_M, -rotation);
  return { dx: r.x, dy: r.y };
}

function buildWorldEdges(room: Room): WorldEdge[] {
  const wv = getWorldVertices(room);
  const n = wv.length;
  if (n < 3) return [];
  const cw = polygonIsClockwise(wv);
  const edges: WorldEdge[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = wv[i], p2 = wv[(i + 1) % n];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const isVert = Math.abs(dx) < 0.5 && Math.abs(dy) >= 0.5;
    const isHoriz = Math.abs(dy) < 0.5 && Math.abs(dx) >= 0.5;
    if (!isVert && !isHoriz) continue;
    if (isVert) {
      edges.push({ wallIndex: i, perpCoord: (p1.x + p2.x) / 2,
        parallelMin: Math.min(p1.y, p2.y), parallelMax: Math.max(p1.y, p2.y),
        isVertical: true, facesPositive: cw ? dy > 0 : dy < 0 });
    } else {
      edges.push({ wallIndex: i, perpCoord: (p1.y + p2.y) / 2,
        parallelMin: Math.min(p1.x, p2.x), parallelMax: Math.max(p1.x, p2.x),
        isVertical: false, facesPositive: cw ? dx < 0 : dx > 0 });
    }
  }
  return edges;
}

function mergeCollinearEdges(edges: WorldEdge[]): WorldEdge[] {
  const result: WorldEdge[] = [];
  const used = new Uint8Array(edges.length);
  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue;
    const base = edges[i];
    const group: WorldEdge[] = [base];
    used[i] = 1;
    for (let j = i + 1; j < edges.length; j++) {
      if (used[j]) continue;
      const e = edges[j];
      if (e.isVertical !== base.isVertical || e.facesPositive !== base.facesPositive) continue;
      if (Math.abs(e.perpCoord - base.perpCoord) > 0.5) continue;
      group.push(e);
      used[j] = 1;
    }
    group.sort((a, b) => a.parallelMin - b.parallelMin);
    let m: WorldEdge = { ...group[0] };
    for (let k = 1; k < group.length; k++) {
      const e = group[k];
      if (e.parallelMin <= m.parallelMax + 2) {
        m.parallelMax = Math.max(m.parallelMax, e.parallelMax);
      } else {
        result.push(m);
        m = { ...e };
      }
    }
    result.push(m);
  }
  return result;
}

export function detectRoomGaps(selectedRoom: Room, allRooms: Room[]): GapInfo[] {
  if (selectedRoom.isFinalized) return [];
  if (selectedRoom.roomType && isSpecialRoomType(selectedRoom.roomType)) return [];
  if (UNSUPPORTED.has(selectedRoom.shape?.toLowerCase?.() ?? '')) return [];

  const tEdges = mergeCollinearEdges(buildWorldEdges(selectedRoom));
  const gaps: GapInfo[] = [];

  for (const other of allRooms) {
    if (other.id === selectedRoom.id) continue;
    const includeOther = other.isFinalized || isSpecialRoomType(other.roomType);
    if (!includeOther) continue;
    if (UNSUPPORTED.has(other.shape?.toLowerCase?.() ?? '')) continue;

    const rEdges = mergeCollinearEdges(buildWorldEdges(other));
    for (const te of tEdges) {
      for (const re of rEdges) {
        if (te.isVertical !== re.isVertical) continue;
        const oMin = Math.max(te.parallelMin, re.parallelMin);
        const oMax = Math.min(te.parallelMax, re.parallelMax);
        if (oMax - oMin < OVERLAP_MIN_PX) continue;
        const gap = Math.abs(te.perpCoord - re.perpCoord);
        if (gap < GAP_MIN_PX || gap > GAP_MAX_PX) continue;

        const aCloser = te.perpCoord < re.perpCoord;
        if (aCloser ? (!te.facesPositive || re.facesPositive) : (te.facesPositive || !re.facesPositive)) continue;

        const deltaPx = te.isVertical
          ? { x: re.perpCoord - te.perpCoord, y: 0 }
          : { x: 0, y: re.perpCoord - te.perpCoord };
        const len = Math.hypot(deltaPx.x, deltaPx.y);
        if (len < 1e-6) continue;

        const midPerp = (te.perpCoord + re.perpCoord) / 2;
        const midPar = (oMin + oMax) / 2;
        const selWallIds = ensureWallIds(selectedRoom);
        const refWallIds = ensureWallIds(other);
        gaps.push({
          roomId: selectedRoom.id,
          targetRoomId: other.id,
          wallIndex: te.wallIndex,
          refWallIndex: re.wallIndex,
          direction: { nx: deltaPx.x / len, ny: deltaPx.y / len },
          wizardWorldPos: te.isVertical ? { x: midPerp, y: midPar } : { x: midPar, y: midPerp },
          deltaPx,
          wallIdTarget: selWallIds[te.wallIndex],
          wallIdRef: refWallIds[re.wallIndex],
          isRectangularFill: true,
        });
      }
    }
  }

  if (gaps.length === 0) {
    // Fallback detector for diagonal/crooked walls: compare nearly-parallel wall
    // segments in world space and derive gap vectors from midpoint-to-midpoint.
    const tSegs = buildWallSegmentsEx(selectedRoom).filter(s => s.lengthPx >= OVERLAP_MIN_PX);
    for (const other of allRooms) {
      if (other.id === selectedRoom.id) continue;
      const includeOther = other.isFinalized || isSpecialRoomType(other.roomType);
      if (!includeOther) continue;
      if (UNSUPPORTED.has(other.shape?.toLowerCase?.() ?? '')) continue;
      const rSegs = buildWallSegmentsEx(other).filter(s => s.lengthPx >= OVERLAP_MIN_PX);

      for (const te of tSegs) {
        const tdx = te.p2.x - te.p1.x;
        const tdy = te.p2.y - te.p1.y;
        const tLen = Math.hypot(tdx, tdy);
        if (tLen < 1e-6) continue;
        const ux = tdx / tLen;
        const uy = tdy / tLen;
        const nx = -uy;
        const ny = ux;

        const tA = te.p1.x * ux + te.p1.y * uy;
        const tB = te.p2.x * ux + te.p2.y * uy;
        const tMin = Math.min(tA, tB);
        const tMax = Math.max(tA, tB);

        for (const re of rSegs) {
          const rdx = re.p2.x - re.p1.x;
          const rdy = re.p2.y - re.p1.y;
          const rLen = Math.hypot(rdx, rdy);
          if (rLen < 1e-6) continue;
          const vx = rdx / rLen;
          const vy = rdy / rLen;

          const parallel = Math.abs(ux * vx + uy * vy);
          if (parallel < 0.93) continue;
          if (te.outwardNormal.x * re.outwardNormal.x + te.outwardNormal.y * re.outwardNormal.y > -0.1) continue;

          const rA = re.p1.x * ux + re.p1.y * uy;
          const rB = re.p2.x * ux + re.p2.y * uy;
          const rMin = Math.min(rA, rB);
          const rMax = Math.max(rA, rB);
          const oMin = Math.max(tMin, rMin);
          const oMax = Math.min(tMax, rMax);
          if (oMax - oMin < OVERLAP_MIN_PX) continue;

          const dx = re.midpoint.x - te.midpoint.x;
          const dy = re.midpoint.y - te.midpoint.y;
          const distSigned = dx * nx + dy * ny;
          const gap = Math.abs(distSigned);
          if (gap < GAP_MIN_PX || gap > GAP_MAX_PX) continue;

          const deltaPx = { x: nx * distSigned, y: ny * distSigned };
          const len = Math.hypot(deltaPx.x, deltaPx.y);
          if (len < 1e-6) continue;

          gaps.push({
            roomId: selectedRoom.id,
            targetRoomId: other.id,
            wallIndex: te.wallIndex,
            refWallIndex: re.wallIndex,
            direction: { nx: deltaPx.x / len, ny: deltaPx.y / len },
            wizardWorldPos: {
              x: (te.midpoint.x + re.midpoint.x) / 2,
              y: (te.midpoint.y + re.midpoint.y) / 2,
            },
            deltaPx,
            wallIdTarget: te.wallId,
            wallIdRef: re.wallId,
            isRectangularFill: te.axis !== 'diagonal' && re.axis !== 'diagonal',
          });
        }
      }
    }
  }

  return gaps;
}

function findStableAnchor(n: number, i1: number, i2: number): number {
  for (let i = 0; i < n; i++) {
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

  const synced = syncRoomFromVertices(normalized);
  return {
    ...targetRoom,
    vertices: normalized,
    x: prelimX + (anchorBefore.x - anchorAfter.x),
    y: prelimY + (anchorBefore.y - anchorAfter.y),
    ...synced,
  };
}

export function computeWizardCarve(targetRoom: Room, gap: GapInfo): Room | null {
  return computeWizardFill(targetRoom, {
    ...gap,
    deltaPx: { x: -gap.deltaPx.x, y: -gap.deltaPx.y },
  });
}

function wizardResultCollides(filledRoom: Room, allRooms: Room[]): boolean {
  const segs = buildWallSegmentsEx(filledRoom);
  for (const other of allRooms) {
    if (other.id === filledRoom.id) continue;
    const os = buildWallSegmentsEx(other);
    for (const a of segs) {
      for (const b of os) {
        const d1x = a.p2.x - a.p1.x, d1y = a.p2.y - a.p1.y;
        const d2x = b.p2.x - b.p1.x, d2y = b.p2.y - b.p1.y;
        const cross = d1x * d2y - d1y * d2x;
        if (Math.abs(cross) < 1e-10) continue;
        const t = ((b.p1.x - a.p1.x) * d2y - (b.p1.y - a.p1.y) * d2x) / cross;
        const u = ((b.p1.x - a.p1.x) * d1y - (b.p1.y - a.p1.y) * d1x) / cross;
        if (t > 0.002 && t < 0.998 && u > 0.002 && u < 0.998) return true;
      }
    }
  }
  return false;
}

export function safeGapFillDistance(targetRoom: Room, gap: GapInfo, allRooms: Room[]): number {
  const others = allRooms.filter(r => r.id !== targetRoom.id);
  const fullRoom = computeWizardFill(targetRoom, gap);
  if (fullRoom && !wizardResultCollides(fullRoom, others)) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const testGap: GapInfo = { ...gap, deltaPx: { x: gap.deltaPx.x * mid, y: gap.deltaPx.y * mid } };
    const testRoom = computeWizardFill(targetRoom, testGap);
    if (!testRoom || wizardResultCollides(testRoom, others)) hi = mid;
    else lo = mid;
  }
  return lo < 1e-4 ? 0 : lo;
}

export function safeGapCarveDistance(targetRoom: Room, gap: GapInfo): number {
  const fullRoom = computeWizardCarve(targetRoom, gap);
  if (!fullRoom) return 0;
  const fullVerts = ensureVertices(fullRoom);
  const fullBb = verticesBoundingBox(fullVerts);
  if (fullBb.w >= 0.2 && fullBb.h >= 0.2) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const testGap: GapInfo = { ...gap, deltaPx: { x: gap.deltaPx.x * mid, y: gap.deltaPx.y * mid } };
    const testRoom = computeWizardCarve(targetRoom, testGap);
    if (!testRoom) { hi = mid; continue; }
    const bb = verticesBoundingBox(ensureVertices(testRoom));
    if (bb.w < 0.2 || bb.h < 0.2) hi = mid;
    else lo = mid;
  }
  return lo < 1e-4 ? 0 : lo;
}

// ---------------------------------------------------------------------------
// Corner fill detection
// ---------------------------------------------------------------------------

const CORNER_POS_EPS = 2; // px — two corners at this distance are considered the same point
const MIN_FILL_M = 0.3;   // minimum fill dimension in metres

function cornersAtSamePosition(a: RoomCorner, b: RoomCorner): boolean {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) < CORNER_POS_EPS;
}

/**
 * Detects empty rectangular areas formed between two corners from different
 * finalized rooms.  Returns up to 5 candidates sorted by area descending.
 */
export function detectCornerFills(rooms: Room[]): CornerFillInfo[] {
  const finalized = rooms.filter(
    r => r.isFinalized && (r.rotation ?? 0) === 0 && !UNSUPPORTED.has(r.shape?.toLowerCase?.() ?? ''),
  );
  if (finalized.length < 2) return [];

  const allCorners = getAllRoomCorners(finalized);
  const results: CornerFillInfo[] = [];

  // Compare every pair of corners from different rooms
  for (let i = 0; i < allCorners.length; i++) {
    const ca = allCorners[i];
    for (let j = i + 1; j < allCorners.length; j++) {
      const cb = allCorners[j];
      if (ca.roomId === cb.roomId) continue;
      // Corners cannot already be at the same position (that would be a shared corner)
      if (cornersAtSamePosition(ca, cb)) continue;

      // They must share either the same X or the same Y axis (aligned in one dimension)
      const sameX = Math.abs(ca.x - cb.x) < CORNER_POS_EPS;
      const sameY = Math.abs(ca.y - cb.y) < CORNER_POS_EPS;
      if (!sameX && !sameY) continue;

      // Compute the fill rectangle
      const fillX = Math.min(ca.x, cb.x);
      const fillY = Math.min(ca.y, cb.y);
      const fillWpx = Math.abs(ca.x - cb.x);
      const fillHpx = Math.abs(ca.y - cb.y);
      const fillWm = fillWpx / PX_PER_M;
      const fillHm = fillHpx / PX_PER_M;

      // Skip if too small
      if (fillWm < MIN_FILL_M || fillHm < MIN_FILL_M) continue;

      // Check both walls face toward the fill rectangle (inward normals toward C)
      // The outward normal of the wall should point roughly away from the fill centre
      const fillCx = fillX + fillWpx / 2;
      const fillCy = fillY + fillHpx / 2;

      const wallSegsA = buildWallSegmentsEx(finalized.find(r => r.id === ca.roomId)!);
      const wallSegsB = buildWallSegmentsEx(finalized.find(r => r.id === cb.roomId)!);
      const segA = wallSegsA.find(s => s.wallId === ca.wallId2); // outgoing wall at corner A
      const segB = wallSegsB.find(s => s.wallId === cb.wallId2); // outgoing wall at corner B

      if (!segA || !segB) continue;

      // Outward normal of segA should point away from fillCentre
      const dax = fillCx - segA.midpoint.x;
      const day = fillCy - segA.midpoint.y;
      const dotA = dax * segA.outwardNormal.x + day * segA.outwardNormal.y;
      if (dotA < 0) continue; // segA faces away from fill area

      const dbx = fillCx - segB.midpoint.x;
      const dby = fillCy - segB.midpoint.y;
      const dotB = dbx * segB.outwardNormal.x + dby * segB.outwardNormal.y;
      if (dotB < 0) continue; // segB faces away from fill area

      // Check the fill rectangle doesn't overlap any existing room
      const overlaps = finalized.some(r => {
        const rx = r.x, ry = r.y;
        const rw = r.length * PX_PER_M, rh = r.width * PX_PER_M;
        return !(fillX + fillWpx <= rx || fillX >= rx + rw ||
                 fillY + fillHpx <= ry || fillY >= ry + rh);
      });
      if (overlaps) continue;

      results.push({
        id: `${ca.cornerId}__${cb.cornerId}`,
        roomIdA: ca.roomId,
        roomIdB: cb.roomId,
        wallIdA: ca.wallId2,
        wallIdB: cb.wallId2,
        cornerAx: ca.x,
        cornerAy: ca.y,
        cornerBx: cb.x,
        cornerBy: cb.y,
        fillX,
        fillY,
        fillWpx,
        fillHpx,
        fillWm,
        fillHm,
        wizardWorldPos: { x: fillCx, y: fillCy },
      });
    }
  }

  // Sort by area descending, return top 5
  results.sort((a, b) => b.fillWm * b.fillHm - a.fillWm * a.fillHm);
  return results.slice(0, 5);
}
