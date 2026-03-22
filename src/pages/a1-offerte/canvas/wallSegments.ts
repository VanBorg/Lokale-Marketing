import Flatten from '@flatten-js/core';
import { Room, ensureVertices, verticesBoundingBox, ensureWallIds, cornerIdFromWalls } from '../types';
import { PX_PER_M, rotateVector2DDeg } from './canvasTypes';

// ─── Types ────────────────────────────────────────────────────

export type WallSegment = {
  roomId: string;
  wallIndex: number;
  wallId: string;
  p1: Flatten.Point;
  p2: Flatten.Point;
  segment: Flatten.Segment;
  midpoint: Flatten.Point;
  outwardNormal: Flatten.Vector;
  lengthPx: number;
  axis: 'horizontal' | 'vertical' | 'diagonal';
};

export type RoomCorner = {
  cornerId: string;
  roomId: string;
  wallId1: string;
  wallId2: string;
  point: Flatten.Point;
  isConvex: boolean;
};

// ─── Private helpers ──────────────────────────────────────────

function shoelaceSign(pts: { x: number; y: number }[]): number {
  let sum = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum;
}

function rotateAroundCentre(
  vx: number, vy: number, cx: number, cy: number, rotation: number,
): { x: number; y: number } {
  const r = rotateVector2DDeg(vx - cx, vy - cy, rotation);
  return { x: r.x + cx, y: r.y + cy };
}

// ─── Main exports ─────────────────────────────────────────────

export function computeWallSegments(room: Room): WallSegment[] {
  const localVerts = ensureVertices(room);
  if (localVerts.length < 3) return [];

  const bb = verticesBoundingBox(localVerts);
  const cx = bb.minX + bb.w / 2;
  const cy = bb.minY + bb.h / 2;
  const rotation = room.rotation ?? 0;

  const rotatedVerts = rotation === 0
    ? localVerts
    : localVerts.map(v => rotateAroundCentre(v.x, v.y, cx, cy, rotation));

  const worldPts = rotatedVerts.map(v => ({
    x: room.x + v.x * PX_PER_M,
    y: room.y + v.y * PX_PER_M,
  }));

  const cw = shoelaceSign(worldPts) > 0;
  const n = worldPts.length;
  const wallIds = ensureWallIds(room);
  const segments: WallSegment[] = [];

  for (let i = 0; i < n; i++) {
    const wp1 = worldPts[i];
    const wp2 = worldPts[(i + 1) % n];
    const dx = wp2.x - wp1.x;
    const dy = wp2.y - wp1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) continue;

    const p1 = new Flatten.Point(wp1.x, wp1.y);
    const p2 = new Flatten.Point(wp2.x, wp2.y);

    const nx = cw ? dy / len : -dy / len;
    const ny = cw ? -dx / len : dx / len;

    const axis: WallSegment['axis'] =
      Math.abs(dy) < 0.5 ? 'horizontal' : Math.abs(dx) < 0.5 ? 'vertical' : 'diagonal';

    segments.push({
      roomId: room.id,
      wallIndex: i,
      wallId: wallIds[i] ?? `${room.id}-w${i}`,
      p1,
      p2,
      segment: new Flatten.Segment(p1, p2),
      midpoint: new Flatten.Point((wp1.x + wp2.x) / 2, (wp1.y + wp2.y) / 2),
      outwardNormal: new Flatten.Vector(nx, ny),
      lengthPx: len,
      axis,
    });
  }

  return segments;
}

export function computeRoomCorners(room: Room): RoomCorner[] {
  const segs = computeWallSegments(room);
  if (segs.length < 2) return [];

  const n = segs.length;
  const worldPts = segs.map(s => ({ x: s.p1.x, y: s.p1.y }));
  const cw = shoelaceSign(worldPts) > 0;
  const corners: RoomCorner[] = [];

  for (let i = 0; i < n; i++) {
    const incoming = segs[(i - 1 + n) % n];
    const outgoing = segs[i];

    const inDx = incoming.p2.x - incoming.p1.x;
    const inDy = incoming.p2.y - incoming.p1.y;
    const outDx = outgoing.p2.x - outgoing.p1.x;
    const outDy = outgoing.p2.y - outgoing.p1.y;
    const cross = inDx * outDy - inDy * outDx;

    corners.push({
      cornerId: cornerIdFromWalls(incoming.wallId, outgoing.wallId),
      roomId: room.id,
      wallId1: incoming.wallId,
      wallId2: outgoing.wallId,
      point: outgoing.p1,
      isConvex: cw ? cross > 0 : cross < 0,
    });
  }

  return corners;
}

export function computeAllWallSegments(rooms: Room[], excludeId?: string): WallSegment[] {
  const result: WallSegment[] = [];
  for (const room of rooms) {
    if (room.id === excludeId) continue;
    result.push(...computeWallSegments(room));
  }
  return result;
}
