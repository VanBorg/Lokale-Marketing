import { Room, Vertex, computeQuadCorners, ensureVertices, getShapePoints, verticesBoundingBox } from '../types';
import { WallId, PX_PER_M, WallSegment, SpecialRoomSnapInfo } from './canvasTypes';
import { computeWorldWallSegments } from './wallSegments';

/** Unit normal perpendicular to wall in vertex (metre) space (left of edge direction). */
export function wallNormal(v1: Vertex, v2: Vertex): { nx: number; ny: number } {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { nx: 0, ny: -1 };
  return { nx: -dy / len, ny: dx / len };
}

/** Project world-space pointer delta (px) onto wall normal in metres; matches room Group rotation. */
export function projectWorldDeltaToNormalMetres(
  dWorldPx: { x: number; y: number },
  rotationDeg: number,
  nx: number,
  ny: number,
): number {
  const rot = (rotationDeg * Math.PI) / 180;
  const cosA = Math.cos(-rot);
  const sinA = Math.sin(-rot);
  const dlx = dWorldPx.x * cosA - dWorldPx.y * sinA;
  const dly = dWorldPx.x * sinA + dWorldPx.y * cosA;
  const mx = dlx / PX_PER_M;
  const my = dly / PX_PER_M;
  return mx * nx + my * ny;
}

const AXIS_EPS = 1e-6;

/** Cursor for mid-wall drag: horizontal edge → ns, vertical → ew, else move. */
export function wallMidDragCursor(v1: Vertex, v2: Vertex): string {
  if (Math.abs(v2.y - v1.y) < AXIS_EPS) return 'ns-resize';
  if (Math.abs(v2.x - v1.x) < AXIS_EPS) return 'ew-resize';
  return 'move';
}

/**
 * Resize cursors from {@link HANDLE_CURSORS} / {@link wallMidDragCursor} are defined in room-local
 * axes. The room {@link Group} applies `rotation`, but CSS cursors stay screen-axis-aligned.
 * Quarter-turn steps (0/90/180/270, same convention as Konva room rotation) map local → screen.
 */
export function rotatedResizeCursor(base: string, rotationDeg: number): string {
  if (
    base === 'move'
    || base === 'pointer'
    || base === 'grab'
    || base === 'crosshair'
    || base === 'default'
    || base === ''
  ) {
    return base;
  }
  const quarter = ((Math.round(rotationDeg / 90) % 4) + 4) % 4;
  const odd = quarter % 2 === 1;

  if (base === 'ns-resize' || base === 'ew-resize') {
    const isNs = base === 'ns-resize';
    // Odd quarter-turns swap screen-axis meaning: local ns ↔ ew
    return (isNs === odd) ? 'ew-resize' : 'ns-resize';
  }
  if (base === 'nwse-resize' || base === 'nesw-resize') {
    const isNwse = base === 'nwse-resize';
    return (isNwse === odd) ? 'nesw-resize' : 'nwse-resize';
  }
  return base;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function nearestWall(px: number, py: number, w: number, h: number): { wall: WallId; position: number } {
  const dTop = py;
  const dBottom = h - py;
  const dLeft = px;
  const dRight = w - px;
  const min = Math.min(dTop, dBottom, dLeft, dRight);

  if (min === dTop) return { wall: 'top', position: clamp(px / w, 0.05, 0.95) };
  if (min === dBottom) return { wall: 'bottom', position: clamp(px / w, 0.05, 0.95) };
  if (min === dLeft) return { wall: 'left', position: clamp(py / h, 0.05, 0.95) };
  return { wall: 'right', position: clamp(py / h, 0.05, 0.95) };
}

export function isNonRect(room: Room): boolean {
  if (room.vertices && room.vertices.length >= 3) {
    if (room.vertices.length !== 4) return true;
    for (let i = 0; i < 4; i++) {
      const a = room.vertices[i];
      const b = room.vertices[(i + 1) % 4];
      if (Math.abs(a.y - b.y) >= 0.001 && Math.abs(a.x - b.x) >= 0.001) return true;
    }
    return false;
  }
  const wl = room.wallLengths;
  if (!wl) return false;
  return wl.top !== wl.bottom || wl.left !== wl.right;
}

export function vertexBounds(room: Room): { w: number; h: number; pts: number[] } {
  const verts = ensureVertices(room);
  const bb = verticesBoundingBox(verts);
  const pts = verts.flatMap(v => [v.x * PX_PER_M, v.y * PX_PER_M]);
  return { w: bb.w * PX_PER_M, h: bb.h * PX_PER_M, pts };
}

export function quadBounds(room: Room): { w: number; h: number; pts: number[] } {
  if (room.vertices && room.vertices.length >= 3) {
    return vertexBounds(room);
  }
  const wl = room.wallLengths;
  const pts = computeQuadCorners(wl);
  let maxX = 0, maxY = 0;
  for (let i = 0; i < pts.length; i += 2) {
    maxX = Math.max(maxX, pts[i]);
    maxY = Math.max(maxY, pts[i + 1]);
  }
  return { w: maxX, h: maxY, pts };
}

export function boundingSize(room: Room): { w: number; h: number } {
  if (room.vertices && room.vertices.length >= 3) {
    const bb = verticesBoundingBox(room.vertices);
    return { w: bb.w * PX_PER_M, h: bb.h * PX_PER_M };
  }
  if (isNonRect(room)) {
    const { w, h } = quadBounds(room);
    return { w, h };
  }
  const rotated = room.rotation === 90 || room.rotation === 270;
  return {
    w: (rotated ? room.width : room.length) * PX_PER_M,
    h: (rotated ? room.length : room.width) * PX_PER_M,
  };
}

const Y_LEVEL_EPS = 1e-3;

function uniqueSortedYs(verts: Vertex[]): number[] {
  const sorted = verts.map((v) => v.y).sort((a, b) => a - b);
  const out: number[] = [];
  for (const y of sorted) {
    if (out.length === 0 || Math.abs(y - out[out.length - 1]) > Y_LEVEL_EPS) {
      out.push(y);
    }
  }
  return out;
}

/**
 * Local pixel position for the room name label. T- and U-shapes use the main horizontal bar
 * (top crossbar vs bottom base) so the label stays clear when sub-rooms fill the arms/stem.
 */
export function getRoomLabelCentreLocalPx(room: Room, wPx: number, hPx: number): { cx: number; cy: number } {
  const halfW = wPx / 2;
  const halfH = hPx / 2;
  if (room.shape !== 't-vorm' && room.shape !== 'u-vorm') {
    return { cx: halfW, cy: halfH };
  }
  const verts = ensureVertices(room);
  const bb = verticesBoundingBox(verts);
  if (bb.w < 1e-6 || bb.h < 1e-6) {
    return { cx: halfW, cy: halfH };
  }
  const ys = uniqueSortedYs(verts);
  if (ys.length < 2) {
    return { cx: halfW, cy: halfH };
  }
  let yCentreM: number;
  if (room.shape === 't-vorm') {
    yCentreM = (ys[0] + ys[1]) / 2;
  } else {
    yCentreM = (ys[ys.length - 2] + ys[ys.length - 1]) / 2;
  }
  const cxM = (bb.minX + bb.maxX) / 2;
  const cyPx = ((yCentreM - bb.minY) / bb.h) * hPx;
  const cxPx = ((cxM - bb.minX) / bb.w) * wPx;
  return { cx: cxPx, cy: cyPx };
}

export function miniPoints(room: Room, w: number, h: number): number[] {
  if (room.vertices && room.vertices.length >= 3) {
    return ensureVertices(room).flatMap(v => [v.x * PX_PER_M, v.y * PX_PER_M]);
  }
  const wl = room.wallLengths;
  if (wl && (wl.top !== wl.bottom || wl.left !== wl.right)) {
    return computeQuadCorners(wl);
  }
  return getShapePoints(room.shape, w, h);
}

export type GridLines = { thin: { points: number[] }[]; thick: { points: number[] }[] };

export function computeGridLines(
  size: { width: number; height: number },
  stagePos: { x: number; y: number },
  scale: number,
): GridLines {
  if (!size.width || !size.height) return { thin: [], thick: [] };
  const thinStep = 80;
  const thickStep = 400;
  const x0 = Math.floor(-stagePos.x / scale / thinStep) * thinStep - thinStep;
  const y0 = Math.floor(-stagePos.y / scale / thinStep) * thinStep - thinStep;
  const x1 = x0 + size.width / scale + thinStep * 2;
  const y1 = y0 + size.height / scale + thinStep * 2;
  const thin: { points: number[] }[] = [];
  const thick: { points: number[] }[] = [];
  for (let x = Math.floor(x0 / thinStep) * thinStep; x <= x1; x += thinStep) {
    const pts = [x, y0, x, y1];
    if (x % thickStep === 0) thick.push({ points: pts }); else thin.push({ points: pts });
  }
  for (let y = Math.floor(y0 / thinStep) * thinStep; y <= y1; y += thinStep) {
    const pts = [x0, y, x1, y];
    if (y % thickStep === 0) thick.push({ points: pts }); else thin.push({ points: pts });
  }
  return { thin, thick };
}

export function computeGhostPos(
  room: Room,
  pointerX: number,
  pointerY: number,
  stageX: number,
  stageY: number,
  stageScaleX: number,
  stageScaleY: number,
): { wall: WallId; position: number } | null {
  const w = room.length * PX_PER_M;
  const h = room.width * PX_PER_M;
  const rot = room.rotation || 0;
  const rad = (rot * Math.PI) / 180;
  const worldX = (pointerX - stageX) / stageScaleX;
  const worldY = (pointerY - stageY) / stageScaleY;
  const dx = worldX - (room.x + w / 2);
  const dy = worldY - (room.y + h / 2);
  const localX = dx * Math.cos(-rad) - dy * Math.sin(-rad) + w / 2;
  const localY = dx * Math.sin(-rad) + dy * Math.cos(-rad) + h / 2;
  if (localX >= 0 && localX <= w && localY >= 0 && localY <= h) {
    return nearestWall(localX, localY, w, h);
  }
  return null;
}

export function computeSnapHighlightRect(
  rooms: Room[],
  snapHighlight: { roomId: string; wall: 'top' | 'right' | 'bottom' | 'left' },
): { x: number; y: number; w: number; h: number } | null {
  const target = rooms.find(r => r.id === snapHighlight.roomId);
  if (!target) return null;
  const { w: tw, h: th } = boundingSize(target);
  const wallThickness = 4;
  let hx = target.x, hy = target.y, hw = tw, hh = wallThickness;
  if (snapHighlight.wall === 'bottom') { hy = target.y + th - wallThickness; }
  if (snapHighlight.wall === 'left') { hw = wallThickness; hh = th; }
  if (snapHighlight.wall === 'right') { hx = target.x + tw - wallThickness; hw = wallThickness; hh = th; }
  return { x: hx, y: hy, w: hw, h: hh };
}

// ─── extractWallSegments ──────────────────────────────────────────────────────
/**
 * Convert all wall edges of a room into flat WallSegment descriptors.
 * Delegates to computeWorldWallSegments (which handles vertices, rotation,
 * winding and outward normals) and maps its output into the flat shape used
 * by the Wall A / Wall B snap algorithm.
 *
 * Only segments longer than minLengthPx are included (skips degenerate edges).
 */
export function extractWallSegments(room: Room, minLengthPx = 4): WallSegment[] {
  const rich = computeWorldWallSegments(room);
  const result: WallSegment[] = [];
  for (const seg of rich) {
    if (seg.lengthPx < minLengthPx) continue;
    const dx = seg.p2.x - seg.p1.x;
    const dy = seg.p2.y - seg.p1.y;
    const len = seg.lengthPx;
    result.push({
      roomId: seg.roomId,
      wallIndex: seg.wallIndex,
      x1: seg.p1.x,
      y1: seg.p1.y,
      x2: seg.p2.x,
      y2: seg.p2.y,
      nx: seg.outwardNormal.x,
      ny: seg.outwardNormal.y,
      tx: dx / len,
      ty: dy / len,
      length: len,
    });
  }
  return result;
}

// ─── snapSpecialRoomToWallSegment ─────────────────────────────────────────────
/**
 * Given a rectangular special room (sw × sh pixels) currently at world position
 * (curX, curY), compute the ideal snapped position flush against Wall A (seg)
 * and slid into the corner of Wall B (the adjacent segment at one end of seg).
 *
 * Works for ANY wall angle — horizontal, vertical, or diagonal.
 *
 * @param sw             Special room bounding width in pixels
 * @param sh             Special room bounding height in pixels
 * @param curX           Current top-left world X of special room
 * @param curY           Current top-left world Y of special room
 * @param seg            Wall A candidate segment
 * @param roomSegments   All segments of the same room (for Wall B lookup)
 * @param snapThreshold  Maximum perp distance (px) to consider this wall a snap candidate
 * @param cornerThreshold Maximum tangent distance (px) to consider Wall B a corner snap
 * @returns SpecialRoomSnapInfo if this wall is within threshold, null otherwise
 */
export function snapSpecialRoomToWallSegment(
  sw: number,
  sh: number,
  curX: number,
  curY: number,
  seg: WallSegment,
  roomSegments: WallSegment[],
  snapThreshold = 50,
  cornerThreshold = 60,
): SpecialRoomSnapInfo | null {
  // The 4 corners of the special room's AABB
  const corners = [
    { x: curX,      y: curY },
    { x: curX + sw, y: curY },
    { x: curX,      y: curY + sh },
    { x: curX + sw, y: curY + sh },
  ];

  // Signed perpendicular distance of each corner to Wall A's infinite line.
  // Positive = on the outward-normal side (outside the room — approaching).
  const perpDists = corners.map(c =>
    (c.x - seg.x1) * seg.nx + (c.y - seg.y1) * seg.ny,
  );

  const dMin = Math.min(...perpDists);
  const dMax = Math.max(...perpDists);

  // Reject if the snap face is too far away or fully behind the wall
  if (dMin > snapThreshold) return null;
  if (dMax < -4) return null;

  // Tangent projections of each corner along Wall A direction
  const tangProjs = corners.map(c =>
    (c.x - seg.x1) * seg.tx + (c.y - seg.y1) * seg.ty,
  );
  const tMin = Math.min(...tangProjs);
  const tMax = Math.max(...tangProjs);

  // Check that the special room overlaps the wall segment in the tangent direction
  const overlapMin = Math.max(tMin, 0);
  const overlapMax = Math.min(tMax, seg.length);
  if (overlapMax - overlapMin < 4) return null;

  // ── Compute Wall-A flush position ────────────────────────────────────────────
  // Move special room by -dMin in the normal direction so snap face touches seg
  let snapX = curX - dMin * seg.nx;
  let snapY = curY - dMin * seg.ny;

  // tMin/tMax don't change because we moved perpendicular only
  const sMin = tMin;
  const sMax = tMax;

  // ── Find Wall B (corner snap) ─────────────────────────────────────────────────
  const n = roomSegments.length;
  const wallAIdx = roomSegments.findIndex(s => s.wallIndex === seg.wallIndex);

  const wallB_atStart = wallAIdx >= 0 ? roomSegments[(wallAIdx - 1 + n) % n] : null;
  const wallB_atEnd   = wallAIdx >= 0 ? roomSegments[(wallAIdx + 1) % n]     : null;

  const distToStart = Math.abs(sMin);
  const distToEnd   = Math.abs(seg.length - sMax);

  let chosenWallB: WallSegment | null = null;
  let wallBSide: 'start' | 'end' | null = null;
  let deltaT = 0;

  if (wallB_atStart && distToStart < cornerThreshold && distToStart <= distToEnd) {
    chosenWallB = wallB_atStart;
    wallBSide   = 'start';
    deltaT      = -sMin;
  } else if (wallB_atEnd && distToEnd < cornerThreshold) {
    chosenWallB = wallB_atEnd;
    wallBSide   = 'end';
    deltaT      = seg.length - sMax;
  }

  if (deltaT !== 0) {
    snapX += deltaT * seg.tx;
    snapY += deltaT * seg.ty;
  }

  // ── Gap C: remaining space along Wall A beyond the special room ──────────────
  const finalSMax = sMax + deltaT;
  const gapCPx = Math.max(0, seg.length - finalSMax);

  return {
    wallA: seg,
    wallB: chosenWallB,
    wallBSide,
    snapX,
    snapY,
    gapCPx,
  };
}
