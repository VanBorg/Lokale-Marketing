import Flatten from '@flatten-js/core';
import { Room, ensureVertices, verticesBoundingBox } from '../types';
import {
  WallId, SnapResult, SnapResultWithInfo,
  PX_PER_M, SNAP_THRESHOLD, SNAP_THRESHOLD_SPECIAL,
  rotateVector2DDeg,
} from './canvasTypes';
import {
  computeWallSegments, computeRoomCorners, computeAllWallSegments,
  type WallSegment, type RoomCorner,
} from './wallSegments';
import { boundingSize } from './canvasGeometry';
import { getSpecialRoomConfig } from '../specialRooms/index';

// ─── Result type for special room snap ────────────────────────

export type SpecialRoomSnapResult = SnapResult & {
  rotation: number;
  wallSnapSide: number;
  snapType: 'corner-to-corner' | 'wall-to-wall' | 'none';
};

// ─── Shared helpers ───────────────────────────────────────────

function offsetSegments(segs: WallSegment[], dx: number, dy: number): WallSegment[] {
  return segs.map(s => {
    const p1 = new Flatten.Point(s.p1.x + dx, s.p1.y + dy);
    const p2 = new Flatten.Point(s.p2.x + dx, s.p2.y + dy);
    return {
      ...s,
      p1, p2,
      segment: new Flatten.Segment(p1, p2),
      midpoint: new Flatten.Point(s.midpoint.x + dx, s.midpoint.y + dy),
    };
  });
}

function normalForWallId(wall: WallId): { nx: number; ny: number } {
  switch (wall) {
    case 'left':   return { nx: -1, ny: 0 };
    case 'right':  return { nx:  1, ny: 0 };
    case 'top':    return { nx: 0, ny: -1 };
    case 'bottom': return { nx: 0, ny:  1 };
  }
}

function segmentMatchesActiveWall(seg: WallSegment, wall: WallId, rotDeg: number): boolean {
  const { nx, ny } = normalForWallId(wall);
  const wn = rotateVector2DDeg(nx, ny, ((rotDeg % 360) + 360) % 360);
  return seg.outwardNormal.x * wn.x + seg.outwardNormal.y * wn.y > 0.5;
}

function findParallelSegments(
  seg: WallSegment, candidates: WallSegment[], maxDist: number,
): Array<{ segment: WallSegment; distPx: number; overlapPx: number }> {
  const results: Array<{ segment: WallSegment; distPx: number; overlapPx: number }> = [];
  for (const c of candidates) {
    if (c.axis !== seg.axis) continue;
    const dot = seg.outwardNormal.x * c.outwardNormal.x + seg.outwardNormal.y * c.outwardNormal.y;
    if (dot > -0.7) continue;

    const dmx = c.midpoint.x - seg.midpoint.x;
    const dmy = c.midpoint.y - seg.midpoint.y;
    const distPx = Math.abs(dmx * seg.outwardNormal.x + dmy * seg.outwardNormal.y);
    if (distPx > maxDist) continue;

    const tx = seg.outwardNormal.y, ty = -seg.outwardNormal.x;
    const s1 = seg.p1.x * tx + seg.p1.y * ty;
    const s2 = seg.p2.x * tx + seg.p2.y * ty;
    const c1 = c.p1.x * tx + c.p1.y * ty;
    const c2 = c.p2.x * tx + c.p2.y * ty;
    const overlapPx = Math.min(Math.max(s1, s2), Math.max(c1, c2))
      - Math.max(Math.min(s1, s2), Math.min(c1, c2));
    if (overlapPx < 4) continue;

    results.push({ segment: c, distPx, overlapPx });
  }
  results.sort((a, b) => a.distPx - b.distPx);
  return results;
}

function computeFlushDelta(
  movingSeg: WallSegment, targetSeg: WallSegment,
): { dx: number; dy: number } {
  const nx = movingSeg.outwardNormal.x;
  const ny = movingSeg.outwardNormal.y;
  const dist = (targetSeg.midpoint.x * nx + targetSeg.midpoint.y * ny)
    - (movingSeg.midpoint.x * nx + movingSeg.midpoint.y * ny);
  return { dx: dist * nx, dy: dist * ny };
}

function collectVertices(segments: WallSegment[]): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const EPS = 0.5;
  for (const s of segments) {
    for (const p of [s.p1, s.p2]) {
      if (!pts.some(q => Math.abs(q.x - p.x) < EPS && Math.abs(q.y - p.y) < EPS)) {
        pts.push({ x: p.x, y: p.y });
      }
    }
  }
  return pts;
}

// ─── snapRoom (normal rooms) ─────────────────────────────────

export function snapRoom(
  draggedId: string,
  candidateX: number,
  candidateY: number,
  rooms: Room[],
  activeWalls?: WallId[] | null,
): SnapResultWithInfo {
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return { x: candidateX, y: candidateY };

  if (dragged.roomType !== 'normal') {
    const sr = snapSpecialRoom(draggedId, candidateX, candidateY, rooms);
    return { x: sr.x, y: sr.y, snappedToId: sr.snappedToId, snappedWall: sr.snappedWall };
  }

  if (activeWalls && activeWalls.length > 0) {
    return snapNormalWallSegment(draggedId, candidateX, candidateY, rooms, dragged, activeWalls);
  }
  return snapNormalBbox(draggedId, candidateX, candidateY, rooms, dragged);
}

function snapNormalWallSegment(
  draggedId: string, x: number, y: number,
  rooms: Room[], dragged: Room, activeWalls: WallId[],
): SnapResultWithInfo {
  const ddx = x - dragged.x;
  const ddy = y - dragged.y;
  const allDragSegs = offsetSegments(computeWallSegments(dragged), ddx, ddy);
  const rotDeg = dragged.rotation ?? 0;

  let candidates = allDragSegs.filter(seg =>
    activeWalls.some(w => segmentMatchesActiveWall(seg, w, rotDeg)),
  );
  if (candidates.length === 0) candidates = [...allDragSegs];

  const otherSegs = computeAllWallSegments(rooms, draggedId);

  let bestDx = 0, bestDy = 0;
  let bestDxDist = SNAP_THRESHOLD, bestDyDist = SNAP_THRESHOLD;
  let snappedToId: string | undefined;
  let snappedWall: string | undefined;

  for (const dragSeg of candidates) {
    if (dragSeg.axis === 'diagonal') continue;
    const matches = findParallelSegments(dragSeg, otherSegs, SNAP_THRESHOLD);
    if (matches.length === 0) continue;
    const best = matches[0];
    const snap = computeFlushDelta(dragSeg, best.segment);

    if (dragSeg.axis === 'horizontal' && best.distPx < bestDyDist) {
      bestDyDist = best.distPx; bestDy = snap.dy;
      snappedToId = best.segment.roomId; snappedWall = best.segment.wallId;
    } else if (dragSeg.axis === 'vertical' && best.distPx < bestDxDist) {
      bestDxDist = best.distPx; bestDx = snap.dx;
      snappedToId = best.segment.roomId; snappedWall = best.segment.wallId;
    }
  }

  if (allDragSegs.some(s => s.axis === 'diagonal')) {
    const dragVerts = collectVertices(allDragSegs);
    for (const other of rooms) {
      if (other.id === draggedId) continue;
      for (const ov of collectVertices(computeWallSegments(other))) {
        for (const dv of dragVerts) {
          const ex = ov.x - dv.x, ey = ov.y - dv.y;
          const d = Math.sqrt(ex * ex + ey * ey);
          if (d < Math.min(bestDxDist, bestDyDist)) {
            bestDxDist = d; bestDyDist = d;
            bestDx = ex; bestDy = ey;
            snappedToId = other.id;
          }
        }
      }
    }
  }

  if (bestDx === 0 && bestDy === 0) return { x, y };
  return { x: x + bestDx, y: y + bestDy, snappedToId, snappedWall };
}

function snapNormalBbox(
  draggedId: string, x: number, y: number,
  rooms: Room[], dragged: Room,
): SnapResultWithInfo {
  const { w: dw, h: dh } = boundingSize(dragged);
  let sx = x, sy = y;
  let snappedToId: string | undefined;
  let snappedWall: string | undefined;

  let bestDx = SNAP_THRESHOLD;
  for (const o of rooms) {
    if (o.id === draggedId) continue;
    const { w: ow } = boundingSize(o);
    const dL = Math.abs(x - (o.x + ow));
    if (dL < bestDx) { bestDx = dL; sx = o.x + ow; snappedToId = o.id; snappedWall = 'left'; }
    const dR = Math.abs((x + dw) - o.x);
    if (dR < bestDx) { bestDx = dR; sx = o.x - dw; snappedToId = o.id; snappedWall = 'right'; }
  }
  let bestDy = SNAP_THRESHOLD;
  for (const o of rooms) {
    if (o.id === draggedId) continue;
    const { h: oh } = boundingSize(o);
    const dT = Math.abs(y - (o.y + oh));
    if (dT < bestDy) { bestDy = dT; sy = o.y + oh; snappedToId = o.id; snappedWall = 'top'; }
    const dB = Math.abs((y + dh) - o.y);
    if (dB < bestDy) { bestDy = dB; sy = o.y - dh; snappedToId = o.id; snappedWall = 'bottom'; }
  }

  return { x: sx, y: sy, snappedToId, snappedWall };
}

// ─── snapSpecialRoom ─────────────────────────────────────────

export function snapSpecialRoom(
  draggedId: string,
  candidateX: number,
  candidateY: number,
  rooms: Room[],
): SpecialRoomSnapResult {
  const dragged = rooms.find(r => r.id === draggedId);
  const currentRot = dragged?.rotation ?? 0;
  const noSnap: SpecialRoomSnapResult = {
    x: candidateX, y: candidateY,
    rotation: currentRot, wallSnapSide: dragged?.wallSnapSide ?? 0, snapType: 'none',
  };
  if (!dragged) return noSnap;

  const mode = dragged.specialRoomPlacementMode ?? 'inside';
  if (mode === 'free') return noSnap;

  // Step 1: rotation fitting — find best orientation + approximate flush position
  const rotResult = findBestRotation(dragged, candidateX, candidateY, rooms);

  // Step 2: corner/wall refinement at chosen rotation
  const snapConfig = getSpecialRoomConfig(dragged.roomType);
  const attachIdx = snapConfig?.preferredAttachmentWallIndex;

  if (rotResult) {
    const refinedRooms = rooms.map(r =>
      r.id === draggedId
        ? { ...r, x: rotResult.x, y: rotResult.y, rotation: rotResult.rotation }
        : r,
    );
    const refined = refineSpecialPosition(
      draggedId, rotResult.x, rotResult.y, rotResult.rotation,
      refinedRooms, attachIdx, mode,
    );
    if (refined && refined.snapType !== 'none') {
      return {
        x: refined.x, y: refined.y,
        rotation: rotResult.rotation,
        wallSnapSide: rotResult.sideSign,
        snappedToId: refined.snappedToId, snappedWall: refined.snappedWall,
        snapType: refined.snapType,
      };
    }
    return {
      x: rotResult.x, y: rotResult.y,
      rotation: rotResult.rotation, wallSnapSide: rotResult.sideSign,
      snapType: 'wall-to-wall',
    };
  }

  // No rotation snap found — try corner/wall snap at current canonical rotation
  const nearestCanonical = (Math.round(currentRot / 90) * 90 + 360) % 360;
  const refined = refineSpecialPosition(
    draggedId, candidateX, candidateY, nearestCanonical,
    rooms, attachIdx, mode,
  );
  if (refined && refined.snapType !== 'none') {
    return {
      x: refined.x, y: refined.y,
      rotation: nearestCanonical,
      wallSnapSide: dragged.wallSnapSide ?? 0,
      snappedToId: refined.snappedToId, snappedWall: refined.snappedWall,
      snapType: refined.snapType,
    };
  }

  return { ...noSnap, rotation: nearestCanonical };
}

// ─── Rotation fitting (adapted from canvasWallSnap.ts) ────────

type RotationResult = {
  rotation: number;
  x: number;
  y: number;
  sideSign: number;
};

const ROTATION_THRESHOLD = 80;
const CORNER_THRESHOLD = 72;

function findBestRotation(
  dragged: Room, candX: number, candY: number, allRooms: Room[],
): RotationResult | null {
  if (dragged.roomType === 'normal') return null;

  const finalizedHosts = allRooms.filter(r => r.id !== dragged.id && r.isFinalized);
  const hostRooms = finalizedHosts.length > 0
    ? finalizedHosts
    : allRooms.filter(r => r.id !== dragged.id && r.roomType === 'normal');
  const hostSegs = hostRooms.flatMap(r => computeWallSegments(r));
  if (hostSegs.length === 0) return null;

  const oldSize = boundingSize(dragged);
  const oldCx = oldSize.w / 2;
  const oldCy = oldSize.h / 2;

  const ROTATIONS = [0, 90, 180, 270] as const;
  let bestScore = ROTATION_THRESHOLD;
  let bestMatch: {
    rotation: number; edgeIdx: number; hostSeg: WallSegment; t: number;
  } | null = null;

  for (const tryRot of ROTATIONS) {
    const { w, h } = boundingSize({ ...dragged, rotation: tryRot });
    const tryCx = w / 2;
    const tryCy = h / 2;
    const tryRoom: Room = {
      ...dragged,
      rotation: tryRot,
      x: candX + (oldCx - tryCx),
      y: candY + (oldCy - tryCy),
    };

    const dragSegs = computeWallSegments(tryRoom);
    for (let di = 0; di < dragSegs.length; di++) {
      const ds = dragSegs[di];
      const dLen = ds.lengthPx;
      if (dLen < 1e-6) continue;
      const dUx = (ds.p2.x - ds.p1.x) / dLen;
      const dUy = (ds.p2.y - ds.p1.y) / dLen;

      for (const hs of hostSegs) {
        if (hs.lengthPx < 40) continue;
        const hLen = hs.lengthPx;
        const hUx = (hs.p2.x - hs.p1.x) / hLen;
        const hUy = (hs.p2.y - hs.p1.y) / hLen;

        // Reject diagonal host walls (deviation > 5° from axis)
        const wallAngle = Math.atan2(hUy, hUx);
        const mod90 = ((wallAngle % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
        if (Math.min(mod90, Math.PI / 2 - mod90) * 180 / Math.PI > 5) continue;

        if (Math.abs(dUx * hUx + dUy * hUy) < 0.6) continue;

        const hNx = -hUy, hNy = hUx;
        const dMid = ds.midpoint;
        const absPerp = Math.abs((dMid.x - hs.p1.x) * hNx + (dMid.y - hs.p1.y) * hNy);
        const t = ((dMid.x - hs.p1.x) * hUx + (dMid.y - hs.p1.y) * hUy) / hLen;
        if (t < -0.3 || t > 1.3) continue;

        // Corner proximity bonus
        const endpointProx = Math.min(Math.abs(t), Math.abs(1 - t));
        let score = absPerp;
        if (endpointProx < 0.26) {
          const dCornerA = Math.sqrt((dMid.x - hs.p1.x) ** 2 + (dMid.y - hs.p1.y) ** 2);
          const dCornerB = Math.sqrt((dMid.x - hs.p2.x) ** 2 + (dMid.y - hs.p2.y) ** 2);
          const nearestCorner = Math.min(dCornerA, dCornerB);
          if (nearestCorner <= CORNER_THRESHOLD) {
            score = nearestCorner * 0.42 + absPerp * 0.35;
          }
        }

        if (score < bestScore) {
          bestScore = score;
          bestMatch = { rotation: tryRot, edgeIdx: di, hostSeg: hs, t };
        }
      }
    }
  }

  if (!bestMatch) return null;

  // Exact rotation alignment
  const { edgeIdx, hostSeg } = bestMatch;
  const hDirLen = hostSeg.lengthPx;
  const hUx = (hostSeg.p2.x - hostSeg.p1.x) / hDirLen;
  const hUy = (hostSeg.p2.y - hostSeg.p1.y) / hDirLen;
  const hostAngleDeg = Math.atan2(hUy, hUx) * 180 / Math.PI;

  const localVerts = ensureVertices(dragged);
  const v1 = localVerts[edgeIdx];
  const v2 = localVerts[(edgeIdx + 1) % localVerts.length];
  const ldx = v2.x - v1.x, ldy = v2.y - v1.y;
  const lLen = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
  const localAngleDeg = Math.atan2(ldy / lLen, ldx / lLen) * 180 / Math.PI;
  const baseRot = ((hostAngleDeg - localAngleDeg) % 360 + 360) % 360;

  const edgeMidLocalPx = {
    x: ((v1.x + v2.x) / 2) * PX_PER_M,
    y: ((v1.y + v2.y) / 2) * PX_PER_M,
  };

  const computeCandidate = (rotDeg: number) => {
    const { w, h } = boundingSize({ ...dragged, rotation: rotDeg });
    const cx = w / 2, cy = h / 2;
    const rad = rotDeg * Math.PI / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const rmX = cx + (edgeMidLocalPx.x - cx) * cosA - (edgeMidLocalPx.y - cy) * sinA;
    const rmY = cy + (edgeMidLocalPx.x - cx) * sinA + (edgeMidLocalPx.y - cy) * cosA;
    const tlX = candX + (oldCx - cx);
    const tlY = candY + (oldCy - cy);
    const tClamped = Math.max(0, Math.min(1, bestMatch!.t));
    const snapX = hostSeg.p1.x + hUx * tClamped * hDirLen;
    const snapY = hostSeg.p1.y + hUy * tClamped * hDirLen;
    const x = tlX + (snapX - (tlX + rmX));
    const y = tlY + (snapY - (tlY + rmY));
    const hNx = -hUy, hNy = hUx;
    const signedDist = ((x + cx) - hostSeg.p1.x) * hNx + ((y + cy) - hostSeg.p1.y) * hNy;
    return { x, y, rotation: rotDeg, signedDist };
  };

  const cA = computeCandidate(baseRot);
  const cB = computeCandidate((baseRot + 180) % 360);

  const dragCenterX = candX + oldCx;
  const dragCenterY = candY + oldCy;
  const hNx = -hUy, hNy = hUx;
  const dragSide = (dragCenterX - hostSeg.p1.x) * hNx + (dragCenterY - hostSeg.p1.y) * hNy;
  const forcedSide = dragged.wallSnapSide ?? 0;
  const preferSign = forcedSide !== 0 ? forcedSide : Math.sign(dragSide);

  let chosen = cA;
  if (preferSign !== 0) {
    if (Math.sign(cA.signedDist) !== preferSign && Math.sign(cB.signedDist) === preferSign) {
      chosen = cB;
    }
  } else if (Math.abs(cB.signedDist) > Math.abs(cA.signedDist)) {
    chosen = cB;
  }

  // Clamp along host wall so attachment edge stays within segment
  const { w: cw, h: ch } = boundingSize({ ...dragged, rotation: chosen.rotation });
  const ccx = cw / 2, ccy = ch / 2;
  const crad = chosen.rotation * Math.PI / 180;
  const av1Lx = localVerts[edgeIdx].x * PX_PER_M;
  const av1Ly = localVerts[edgeIdx].y * PX_PER_M;
  const av2Lx = localVerts[(edgeIdx + 1) % localVerts.length].x * PX_PER_M;
  const av2Ly = localVerts[(edgeIdx + 1) % localVerts.length].y * PX_PER_M;
  const cosC = Math.cos(crad), sinC = Math.sin(crad);
  const rotPt = (lx: number, ly: number) => ({
    x: chosen.x + ccx + (lx - ccx) * cosC - (ly - ccy) * sinC,
    y: chosen.y + ccy + (lx - ccx) * sinC + (ly - ccy) * cosC,
  });
  const aw1 = rotPt(av1Lx, av1Ly);
  const aw2 = rotPt(av2Lx, av2Ly);
  const t1 = hDirLen > 0.001 ? ((aw1.x - hostSeg.p1.x) * hUx + (aw1.y - hostSeg.p1.y) * hUy) / hDirLen : 0;
  const t2 = hDirLen > 0.001 ? ((aw2.x - hostSeg.p1.x) * hUx + (aw2.y - hostSeg.p1.y) * hUy) / hDirLen : 0;
  const tMin = Math.min(t1, t2), tMax = Math.max(t1, t2);
  let slideT = 0;
  if (tMin < 0) slideT = -tMin;
  else if (tMax > 1) slideT = 1 - tMax;

  return {
    rotation: chosen.rotation,
    x: chosen.x + hUx * slideT * hDirLen,
    y: chosen.y + hUy * slideT * hDirLen,
    sideSign: Math.sign(chosen.signedDist),
  };
}

// ─── Position refinement (adapted from canvasSegmentSnap.ts) ──

type RefinedSnap = {
  x: number; y: number;
  snappedToId?: string; snappedWall?: string;
  snapType: 'corner-to-corner' | 'wall-to-wall' | 'none';
};

function refineSpecialPosition(
  draggedId: string, x: number, y: number, rotation: number,
  rooms: Room[], attachIdx: number | undefined,
  mode: string,
): RefinedSnap | null {
  if (attachIdx === undefined) return null;

  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return null;

  const draggedSegs = computeWallSegments({ ...dragged, x, y, rotation });
  const attachSeg = draggedSegs.find(s => s.wallIndex === attachIdx);
  if (!attachSeg) return null;

  const av1 = attachSeg.p1;
  const av2 = attachSeg.p2;
  const attachLen = attachSeg.lengthPx;
  const dragNormal = attachSeg.outwardNormal;
  const threshold = SNAP_THRESHOLD_SPECIAL;

  let bestDist = threshold * 3;
  let bestResult: RefinedSnap = { x, y, snapType: 'none' };

  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const otherSegs = computeWallSegments(other);

    for (const seg of otherSegs) {
      const normalDot = dragNormal.x * seg.outwardNormal.x + dragNormal.y * seg.outwardNormal.y;

      // Wall-to-wall: try both endpoint alignments
      for (const [srcV, tgtV, otherEnd, chkV] of [
        [av1, seg.p1, av2, seg.p2],
        [av1, seg.p2, av2, seg.p1],
      ] as const) {
        const ddx = tgtV.x - srcV.x;
        const ddy = tgtV.y - srcV.y;
        const proj2x = otherEnd.x + ddx;
        const proj2y = otherEnd.y + ddy;
        const endDist = Math.sqrt((proj2x - chkV.x) ** 2 + (proj2y - chkV.y) ** 2);
        const lenDiff = Math.abs(attachLen - seg.lengthPx);
        if (endDist < threshold && lenDiff < threshold && normalDot < -0.5) {
          const total = Math.sqrt(ddx * ddx + ddy * ddy) + endDist;
          if (total < bestDist) {
            bestDist = total;
            bestResult = {
              x: x + ddx, y: y + ddy,
              snappedToId: other.id, snappedWall: seg.wallId,
              snapType: 'wall-to-wall',
            };
          }
        }
      }

      // Corner-to-corner: mode-aware normal guard
      const isInsideMode = mode !== 'outside';
      const cornerGuard = isInsideMode ? normalDot > 0.5 : normalDot < -0.5;
      if (cornerGuard) {
        for (const av of [av1, av2]) {
          for (const tv of [seg.p1, seg.p2]) {
            const ddx = tv.x - av.x;
            const ddy = tv.y - av.y;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dist < threshold && dist < bestDist) {
              bestDist = dist;
              bestResult = {
                x: x + ddx, y: y + ddy,
                snappedToId: other.id, snappedWall: seg.wallId,
                snapType: 'corner-to-corner',
              };
            }
          }
        }
      }
    }
  }

  if (bestResult.snapType === 'none') return null;

  // Corner tuck: after wall-to-wall snap, try sliding into a corner
  if (bestResult.snapType === 'wall-to-wall') {
    const tucked = tryCornerTuck(
      draggedId, bestResult.x, bestResult.y, rotation, rooms, attachIdx,
    );
    if (tucked) {
      return { ...bestResult, x: tucked.x, y: tucked.y };
    }
  }

  return bestResult;
}

// ─── Corner tuck detection ────────────────────────────────────

function tryCornerTuck(
  draggedId: string, x: number, y: number, rotation: number,
  rooms: Room[], attachIdx: number,
): { x: number; y: number } | null {
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return null;

  const dragSegs = computeWallSegments({ ...dragged, x, y, rotation });
  const attachSeg = dragSegs.find(s => s.wallIndex === attachIdx);
  if (!attachSeg) return null;

  const TUCK_THRESHOLD = 60;

  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const otherSegs = computeWallSegments(other);

    // Find the host wall that the attachment wall is flush against
    for (const hostWall of otherSegs) {
      const normalDot = attachSeg.outwardNormal.x * hostWall.outwardNormal.x
        + attachSeg.outwardNormal.y * hostWall.outwardNormal.y;
      if (normalDot > -0.5) continue;

      // Check if attachment wall overlaps host wall in tangent direction
      const tx = hostWall.p2.x - hostWall.p1.x;
      const ty = hostWall.p2.y - hostWall.p1.y;
      const hLen = hostWall.lengthPx;
      if (hLen < 1e-6) continue;
      const ux = tx / hLen, uy = ty / hLen;

      const ap1t = ((attachSeg.p1.x - hostWall.p1.x) * ux + (attachSeg.p1.y - hostWall.p1.y) * uy);
      const ap2t = ((attachSeg.p2.x - hostWall.p1.x) * ux + (attachSeg.p2.y - hostWall.p1.y) * uy);
      const aMin = Math.min(ap1t, ap2t);
      const aMax = Math.max(ap1t, ap2t);

      // Check for tuck at start of host wall (t=0)
      if (Math.abs(aMin) < TUCK_THRESHOLD && aMin > -TUCK_THRESHOLD) {
        const slide = -aMin;
        return { x: x + slide * ux, y: y + slide * uy };
      }
      // Check for tuck at end of host wall (t=hLen)
      if (Math.abs(hLen - aMax) < TUCK_THRESHOLD && (hLen - aMax) > -TUCK_THRESHOLD) {
        const slide = hLen - aMax;
        return { x: x + slide * ux, y: y + slide * uy };
      }
    }
  }

  return null;
}

// ─── Backward-compatible aliases ─────────────────────────────

/** @deprecated Use snapRoom */
export function snapPosition(
  draggedId: string, x: number, y: number,
  rooms: Room[], activeWalls?: WallId[] | null,
): SnapResultWithInfo {
  return snapRoom(draggedId, x, y, rooms, activeWalls);
}

/** @deprecated Use snapRoom */
export function snapToRooms(
  draggedId: string, x: number, y: number, rooms: Room[],
): SnapResultWithInfo {
  return snapRoom(draggedId, x, y, rooms, null);
}

/** @deprecated Use snapRoom */
export function snapToGrid(
  draggedId: string, x: number, y: number,
  rooms: Room[], activeWalls?: WallId[] | null,
): SnapResultWithInfo {
  return snapRoom(draggedId, x, y, rooms, activeWalls);
}
