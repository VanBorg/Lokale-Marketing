import type { Room, Vertex } from '../types';
import { ensureVertices, syncRoomFromVertices, verticesBoundingBox, isSpecialRoomType } from '../types';
import { PX_PER_M, rotateVector2DDeg, type GapInfo } from './canvasTypes';
import { polygonIsClockwise, computeWorldWallSegments } from './wallSegments';

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
    if (other.id === selectedRoom.id || !other.isFinalized) continue;
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
        gaps.push({
          roomId: selectedRoom.id,
          targetRoomId: other.id,
          wallIndex: te.wallIndex,
          refWallIndex: re.wallIndex,
          direction: { nx: deltaPx.x / len, ny: deltaPx.y / len },
          wizardWorldPos: te.isVertical ? { x: midPerp, y: midPar } : { x: midPar, y: midPerp },
          deltaPx,
        });
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

function wizardResultCollides(filledRoom: Room, allRooms: Room[]): boolean {
  const segs = computeWorldWallSegments(filledRoom);
  for (const other of allRooms) {
    if (other.id === filledRoom.id) continue;
    const os = computeWorldWallSegments(other);
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
