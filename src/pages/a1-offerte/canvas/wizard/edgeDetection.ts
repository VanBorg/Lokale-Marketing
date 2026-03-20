import type { Room } from '../../types';
import type { FacingEdgePair } from '../canvasTypes';
import { polygonIsClockwise } from '../wallSegments';
import { getWorldVertices } from './worldSpace';

const EPS = 0.5;

type WorldEdge = {
  roomId: string;
  wallIndex: number;
  perpCoord: number;
  parallelMin: number;
  parallelMax: number;
  isVertical: boolean;
  facesPositive: boolean;
};

function buildEdgeNormals(worldPts: { x: number; y: number }[]): { nx: number; ny: number }[] {
  const n = worldPts.length;
  const cw = polygonIsClockwise(worldPts);
  const normals: { nx: number; ny: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = worldPts[i];
    const p2 = worldPts[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) {
      normals.push({ nx: 0, ny: 0 });
      continue;
    }
    const nx = cw ? dy / len : -dy / len;
    const ny = cw ? -dx / len : dx / len;
    normals.push({ nx, ny });
  }
  return normals;
}

export function buildWorldEdges(room: Room): WorldEdge[] {
  const worldPts = getWorldVertices(room);
  const n = worldPts.length;
  if (n < 3) return [];

  const normals = buildEdgeNormals(worldPts);
  const edges: WorldEdge[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = worldPts[i];
    const p2 = worldPts[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const vert = Math.abs(dx) < EPS && Math.abs(dy) >= EPS;
    const horiz = Math.abs(dy) < EPS && Math.abs(dx) >= EPS;
    if (!vert && !horiz) continue;

    const { nx, ny } = normals[i];
    if (vert) {
      if (Math.abs(nx) < 0.5) continue;
      const x = (p1.x + p2.x) / 2;
      edges.push({
        roomId: room.id,
        wallIndex: i,
        perpCoord: x,
        parallelMin: Math.min(p1.y, p2.y),
        parallelMax: Math.max(p1.y, p2.y),
        isVertical: true,
        facesPositive: nx > 0,
      });
    } else {
      if (Math.abs(ny) < 0.5) continue;
      const y = (p1.y + p2.y) / 2;
      edges.push({
        roomId: room.id,
        wallIndex: i,
        perpCoord: y,
        parallelMin: Math.min(p1.x, p2.x),
        parallelMax: Math.max(p1.x, p2.x),
        isVertical: false,
        facesPositive: ny > 0,
      });
    }
  }

  return edges;
}

function verticalFacing(a: WorldEdge, b: WorldEdge): boolean {
  if (a.facesPositive === b.facesPositive) return false;
  if (a.facesPositive && b.perpCoord > a.perpCoord) return true;
  if (!a.facesPositive && b.perpCoord < a.perpCoord) return true;
  return false;
}

function horizontalFacing(a: WorldEdge, b: WorldEdge): boolean {
  if (a.facesPositive === b.facesPositive) return false;
  if (a.facesPositive && b.perpCoord > a.perpCoord) return true;
  if (!a.facesPositive && b.perpCoord < a.perpCoord) return true;
  return false;
}

export function findFacingEdgePairs(
  roomA: Room,
  roomB: Room,
  gapMinPx: number,
  gapMaxPx: number,
  overlapMinPx: number,
): FacingEdgePair[] {
  const edgesA = buildWorldEdges(roomA);
  const edgesB = buildWorldEdges(roomB);
  const pairs: FacingEdgePair[] = [];

  for (const ea of edgesA) {
    for (const eb of edgesB) {
      if (ea.isVertical !== eb.isVertical) continue;
      if (ea.facesPositive === eb.facesPositive) continue;

      let gapPx: number;
      let deltaPx: { x: number; y: number };
      let overlap: number;

      if (ea.isVertical) {
        if (!verticalFacing(ea, eb)) continue;
        gapPx = Math.abs(eb.perpCoord - ea.perpCoord);
        deltaPx = { x: eb.perpCoord - ea.perpCoord, y: 0 };
        overlap = Math.min(ea.parallelMax, eb.parallelMax) - Math.max(ea.parallelMin, eb.parallelMin);
      } else {
        if (!horizontalFacing(ea, eb)) continue;
        gapPx = Math.abs(eb.perpCoord - ea.perpCoord);
        deltaPx = { x: 0, y: eb.perpCoord - ea.perpCoord };
        overlap = Math.min(ea.parallelMax, eb.parallelMax) - Math.max(ea.parallelMin, eb.parallelMin);
      }

      if (gapPx < gapMinPx || gapPx > gapMaxPx) continue;
      if (overlap < overlapMinPx) continue;

      pairs.push({
        roomAId: roomA.id,
        roomBId: roomB.id,
        wallIndexA: ea.wallIndex,
        wallIndexB: eb.wallIndex,
        gapPx,
        overlapPx: overlap,
        deltaPx,
      });
    }
  }

  return pairs;
}
