import { Room, ensureVertices } from '../types';
import { boundingSize } from './canvasGeometry';
import { PX_PER_M } from './canvasTypes';

const DEFAULT_THRESHOLD = 60; // pixels

type Vec2 = { x: number; y: number };

function sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
function dot(a: Vec2, b: Vec2): number { return a.x * b.x + a.y * b.y; }
function vlen(v: Vec2): number { return Math.sqrt(v.x * v.x + v.y * v.y); }
function normalize(v: Vec2): Vec2 { const l = vlen(v) || 1; return { x: v.x / l, y: v.y / l }; }
function rot90(v: Vec2): Vec2 { return { x: -v.y, y: v.x }; }

function rotateAroundCenter(
  px: number, py: number,
  cx: number, cy: number,
  rot: number,
): Vec2 {
  const lx = px - cx;
  const ly = py - cy;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c };
}

function getWorldVertices(room: Room): Vec2[] {
  const verts = ensureVertices(room);
  const { w, h } = boundingSize(room);
  const cx = w / 2;
  const cy = h / 2;
  const rot = (room.rotation || 0) * Math.PI / 180;
  return verts.map(v => {
    const wp = rotateAroundCenter(v.x * PX_PER_M, v.y * PX_PER_M, cx, cy, rot);
    return { x: room.x + wp.x, y: room.y + wp.y };
  });
}

type WorldSegment = { a: Vec2; b: Vec2; roomId: string; edgeIdx: number };

function getWorldSegments(room: Room): WorldSegment[] {
  const wv = getWorldVertices(room);
  const n = wv.length;
  const segs: WorldSegment[] = [];
  for (let i = 0; i < n; i++) {
    const a = wv[i];
    const b = wv[(i + 1) % n];
    if (vlen(sub(b, a)) < 1) continue;
    segs.push({ a, b, roomId: room.id, edgeIdx: i });
  }
  return segs;
}

function perpDistToLine(p: Vec2, a: Vec2, b: Vec2): number {
  const d = normalize(sub(b, a));
  return dot(sub(p, a), rot90(d));
}

function projT(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const segLen = vlen(ab);
  if (segLen < 0.001) return 0;
  return dot(sub(p, a), normalize(ab)) / segLen;
}

export type WallSnapResult = { x: number; y: number; rotation: number };

/**
 * Snap een speciale kamer (roomType !== 'normal') flush tegen het dichtstbijzijnde
 * wandsegment van een definitief gemaakte kamer. Retourneert nieuwe x, y, rotation
 * of null als er niets binnen de drempel valt.
 *
 * draggedRoom moet al de nieuwe x, y hebben vanuit de drag.
 */
export function snapSpecialRoomToWall(
  draggedRoom: Room,
  allRooms: Room[],
  threshold: number = DEFAULT_THRESHOLD,
): WallSnapResult | null {
  if (draggedRoom.roomType === 'normal') return null;

  // Verzamel wandsegmenten van alle definitieve kamers
  const hostSegments: WorldSegment[] = [];
  for (const room of allRooms) {
    if (room.id === draggedRoom.id || !room.isFinalized) continue;
    hostSegments.push(...getWorldSegments(room));
  }
  if (hostSegments.length === 0) return null;

  const dragSegs = getWorldSegments(draggedRoom);
  if (dragSegs.length === 0) return null;

  // Zoek beste kandidaat: (rand van speciale kamer, hostsegment) met kleinste |loodrechte afstand|
  let bestAbsPerp = threshold;
  let bestDragEdgeIdx = -1;
  let bestHostSeg: WorldSegment | null = null;
  let bestT = 0.5;

  for (let di = 0; di < dragSegs.length; di++) {
    const ds = dragSegs[di];
    const dMid: Vec2 = { x: (ds.a.x + ds.b.x) / 2, y: (ds.a.y + ds.b.y) / 2 };
    const dDir = normalize(sub(ds.b, ds.a));

    for (const hs of hostSegments) {
      const hsDir = normalize(sub(hs.b, hs.a));

      // Alleen parallelle wanden (niet haaks op elkaar)
      const parallelism = Math.abs(dot(dDir, hsDir));
      if (parallelism < 0.6) continue;

      const perp = perpDistToLine(dMid, hs.a, hs.b);
      const absPerp = Math.abs(perp);
      if (absPerp >= bestAbsPerp) continue;

      const t = projT(dMid, hs.a, hs.b);
      // Kleine marge voorbij segment-eindpunten toegestaan
      if (t < -0.3 || t > 1.3) continue;

      bestAbsPerp = absPerp;
      bestDragEdgeIdx = di;
      bestHostSeg = hs;
      bestT = t;
    }
  }

  if (!bestHostSeg || bestDragEdgeIdx === -1) return null;

  // ── Bereken nieuwe rotatie ────────────────────────────────────────────────
  const hDir = normalize(sub(bestHostSeg.b, bestHostSeg.a));
  const hostAngleDeg = Math.atan2(hDir.y, hDir.x) * 180 / Math.PI;

  const verts = ensureVertices(draggedRoom);
  const n = verts.length;
  const v1 = verts[bestDragEdgeIdx];
  const v2 = verts[(bestDragEdgeIdx + 1) % n];
  const localDir = normalize({ x: v2.x - v1.x, y: v2.y - v1.y });
  const localEdgeAngleDeg = Math.atan2(localDir.y, localDir.x) * 180 / Math.PI;

  let newRotation = hostAngleDeg - localEdgeAngleDeg;
  newRotation = ((newRotation % 360) + 360) % 360;

  // ── Bereken nieuwe positie ───────────────────────────────────────────────
  const { w, h } = boundingSize(draggedRoom);
  const cx = w / 2;
  const cy = h / 2;
  const newRot = newRotation * Math.PI / 180;

  // Middelpunt van de snappende rand in lokale pixels
  const edgeMidLocalPx: Vec2 = {
    x: ((v1.x + v2.x) / 2) * PX_PER_M,
    y: ((v1.y + v2.y) / 2) * PX_PER_M,
  };

  // Middelpunt na nieuwe rotatie (relatief aan room.x, room.y)
  const rotatedMid = rotateAroundCenter(edgeMidLocalPx.x, edgeMidLocalPx.y, cx, cy, newRot);
  const worldMidAfterRot: Vec2 = {
    x: draggedRoom.x + rotatedMid.x,
    y: draggedRoom.y + rotatedMid.y,
  };

  // Doelpunt: dichtsbijzijnde punt op het hostsegment (licht geclamped)
  const tClamped = Math.max(0.05, Math.min(0.95, bestT));
  const segLen = vlen(sub(bestHostSeg.b, bestHostSeg.a));
  const snapTarget: Vec2 = {
    x: bestHostSeg.a.x + hDir.x * tClamped * segLen,
    y: bestHostSeg.a.y + hDir.y * tClamped * segLen,
  };

  // Verschuiving: schuif kamer zodat rand-middelpunt op snapTarget belandt
  const deltaX = snapTarget.x - worldMidAfterRot.x;
  const deltaY = snapTarget.y - worldMidAfterRot.y;

  return {
    x: draggedRoom.x + deltaX,
    y: draggedRoom.y + deltaY,
    rotation: newRotation,
  };
}
