import { Room, ensureVertices } from '../types';
import { boundingSize } from './canvasGeometry';
import { PX_PER_M } from './canvasTypes';

const DEFAULT_THRESHOLD = 80; // px (≈ 2 m)
const CORNER_THRESHOLD = 72; // px
const CORNER_WEIGHT = 0.6; // lower = prefer corners sooner

type Vec2 = { x: number; y: number };

function sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
function dot(a: Vec2, b: Vec2): number { return a.x * b.x + a.y * b.y; }
function vlen(v: Vec2): number { return Math.sqrt(v.x * v.x + v.y * v.y); }
function normalize(v: Vec2): Vec2 { const l = vlen(v) || 1; return { x: v.x / l, y: v.y / l }; }
function rot90(v: Vec2): Vec2 { return { x: -v.y, y: v.x }; }

function rotateAroundCenter(
  px: number, py: number,
  cx: number, cy: number,
  rad: number,
): Vec2 {
  const lx = px - cx; const ly = py - cy;
  const c = Math.cos(rad); const s = Math.sin(rad);
  return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c };
}

function getWorldVertices(room: Room): Vec2[] {
  const verts = ensureVertices(room);
  const { w, h } = boundingSize(room);
  const cx = w / 2; const cy = h / 2;
  const rad = (room.rotation || 0) * Math.PI / 180;
  return verts.map(v => {
    const wp = rotateAroundCenter(v.x * PX_PER_M, v.y * PX_PER_M, cx, cy, rad);
    return { x: room.x + wp.x, y: room.y + wp.y };
  });
}

type WorldSegment = { a: Vec2; b: Vec2; roomId: string; edgeIdx: number };

function getWorldSegments(room: Room): WorldSegment[] {
  const wv = getWorldVertices(room);
  const n = wv.length;
  const segs: WorldSegment[] = [];
  for (let i = 0; i < n; i++) {
    const a = wv[i]; const b = wv[(i + 1) % n];
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
  const ab = sub(b, a); const segLen = vlen(ab);
  if (segLen < 0.001) return 0;
  return dot(sub(p, a), normalize(ab)) / segLen;
}

export type WallSnapResult = { x: number; y: number; rotation: number };

/**
 * Snap a special room flush against the nearest wall of any finalized room.
 *
 * Tries all 4 canonical orientations (0°/90°/180°/270°) with the room centre
 * held fixed, so the room automatically rotates to match the nearest wall —
 * including snapping portrait against a vertical wall or landscape against a
 * horizontal one.
 *
 * The returned x/y is the NEW bounding-box top-left (room.x / room.y).
 */
export function snapSpecialRoomToWall(
  draggedRoom: Room,
  allRooms: Room[],
  threshold: number = DEFAULT_THRESHOLD,
): WallSnapResult | null {
  if (draggedRoom.roomType === 'normal') return null;

  // Collect host wall segments.
  // Primary mode: finalized rooms (original behaviour).
  // Fallback mode: if none are finalized yet, use normal rooms so snapping still
  // works while users are still sketching.
  const finalizedHosts = allRooms.filter(r => r.id !== draggedRoom.id && r.isFinalized);
  const hostRooms = finalizedHosts.length > 0
    ? finalizedHosts
    : allRooms.filter(r => r.id !== draggedRoom.id && r.roomType === 'normal');
  const hostSegments: WorldSegment[] = [];
  for (const room of hostRooms) hostSegments.push(...getWorldSegments(room));

  if (hostSegments.length === 0) return null;

  const oldSize = boundingSize(draggedRoom);
  const oldCx = oldSize.w / 2;
  const oldCy = oldSize.h / 2;

  // Try all 4 canonical orientations; keep the room's centre fixed between trials
  const ROTATIONS = [0, 90, 180, 270] as const;

  let bestAbsPerp = threshold;
  let bestRotation: number | null = null;
  let bestEdgeIdx = -1;
  let bestHostSeg: WorldSegment | null = null;
  let bestT = 0.5;
  let bestUseCorner = false;
  let bestCornerPoint: Vec2 | null = null;
  let bestCornerDist = Infinity;
  let bestEndpointProximity = Infinity;
  let pairCount = 0;
  let rejectedParallel = 0;
  let rejectedDistance = 0;
  let rejectedProjection = 0;
  let maxParallelSeen = -1;
  let minAngleDiffDeg = 180;

  for (const tryRot of ROTATIONS) {
    const { w, h } = boundingSize({ ...draggedRoom, rotation: tryRot });
    const tryCx = w / 2; const tryCy = h / 2;

    // Shift room position so its centre stays at the same world point
    const tryRoom: Room = {
      ...draggedRoom,
      rotation: tryRot,
      x: draggedRoom.x + (oldCx - tryCx),
      y: draggedRoom.y + (oldCy - tryCy),
    };

    const dragSegs = getWorldSegments(tryRoom);

    for (let di = 0; di < dragSegs.length; di++) {
      const ds = dragSegs[di];
      const dMid: Vec2 = { x: (ds.a.x + ds.b.x) / 2, y: (ds.a.y + ds.b.y) / 2 };
      const dDir = normalize(sub(ds.b, ds.a));

      for (const hs of hostSegments) {
        pairCount++;
        const hsDir = normalize(sub(hs.b, hs.a));
        const parallel = Math.abs(dot(dDir, hsDir));
        if (parallel > maxParallelSeen) maxParallelSeen = parallel;
        const angleDiffDeg = Math.acos(Math.max(-1, Math.min(1, parallel))) * 180 / Math.PI;
        if (angleDiffDeg < minAngleDiffDeg) minAngleDiffDeg = angleDiffDeg;
        if (parallel < 0.6) { rejectedParallel++; continue; } // must be roughly parallel

        const absPerp = Math.abs(perpDistToLine(dMid, hs.a, hs.b));
        const t = projT(dMid, hs.a, hs.b);
        const lineEligible = t >= -0.3 && t <= 1.3;
        const endpointProximity = Math.min(Math.abs(t), Math.abs(1 - t)); // 0 near endpoint

        const dCornerA = vlen(sub(dMid, hs.a));
        const dCornerB = vlen(sub(dMid, hs.b));
        const nearestCornerDist = Math.min(dCornerA, dCornerB);
        const cornerEligible = nearestCornerDist <= CORNER_THRESHOLD || (endpointProximity < 0.26 && absPerp < threshold);

        let candidateDist = Infinity;
        let candidateUseCorner = false;
        let candidateCorner: Vec2 | null = null;
        let candidateT = t;
        if (lineEligible) candidateDist = absPerp;
        if (cornerEligible) {
          // Keep corner preference strong, but never so strong that far corners
          // beat nearby non-corner candidates.
          const endpointBonus = Math.max(0, 1 - endpointProximity * 2); // 1 near endpoint, 0 at centre
          let cornerScore = nearestCornerDist * 0.42 + absPerp * 0.35;
          if (endpointProximity < 0.18) cornerScore -= 6 * endpointBonus;
          cornerScore = Math.max(0, cornerScore);
          if (cornerScore < candidateDist) {
            candidateDist = cornerScore;
            candidateUseCorner = true;
            candidateCorner = dCornerA <= dCornerB ? hs.a : hs.b;
            candidateT = dCornerA <= dCornerB ? 0 : 1;
          }
        }
        if (candidateDist === Infinity) { rejectedProjection++; continue; }
        if (candidateDist >= bestAbsPerp) { rejectedDistance++; continue; }

        bestAbsPerp = candidateDist;
        bestRotation = tryRot;
        bestEdgeIdx = di;
        bestHostSeg = hs;
        bestT = candidateT;
        bestUseCorner = candidateUseCorner;
        bestCornerPoint = candidateCorner;
        bestCornerDist = nearestCornerDist;
        bestEndpointProximity = endpointProximity;
      }
    }
  }

  if (bestHostSeg === null || bestEdgeIdx === -1 || bestRotation === null) return null;

  // ── Exact rotation: align chosen local edge with the host wall direction ──
  const hDir = normalize(sub(bestHostSeg.b, bestHostSeg.a));
  const hostAngleDeg = Math.atan2(hDir.y, hDir.x) * 180 / Math.PI;

  const verts = ensureVertices(draggedRoom);
  const v1 = verts[bestEdgeIdx];
  const v2 = verts[(bestEdgeIdx + 1) % verts.length];
  const localDir = normalize({ x: v2.x - v1.x, y: v2.y - v1.y });
  const localEdgeAngleDeg = Math.atan2(localDir.y, localDir.x) * 180 / Math.PI;
  const baseRotation = ((hostAngleDeg - localEdgeAngleDeg) % 360 + 360) % 360;

  // Snap target: projection of the edge midpoint onto the host wall segment
  const tClamped = Math.max(0, Math.min(1, bestT));
  const segLen = vlen(sub(bestHostSeg.b, bestHostSeg.a));
  const snapTargetX = bestUseCorner && bestCornerPoint
    ? bestCornerPoint.x
    : bestHostSeg.a.x + hDir.x * tClamped * segLen;
  const snapTargetY = bestUseCorner && bestCornerPoint
    ? bestCornerPoint.y
    : bestHostSeg.a.y + hDir.y * tClamped * segLen;

  // Edge midpoint in unrotated local pixel coordinates
  const edgeMidLocalPx: Vec2 = {
    x: ((v1.x + v2.x) / 2) * PX_PER_M,
    y: ((v1.y + v2.y) / 2) * PX_PER_M,
  };

  const computeSnapForRotation = (rotationDeg: number) => {
    const { w, h } = boundingSize({ ...draggedRoom, rotation: rotationDeg });
    const cx = w / 2; const cy = h / 2;
    const rad = rotationDeg * Math.PI / 180;
    const rotatedMid = rotateAroundCenter(edgeMidLocalPx.x, edgeMidLocalPx.y, cx, cy, rad);
    const topLeftX = draggedRoom.x + (oldCx - cx);
    const topLeftY = draggedRoom.y + (oldCy - cy);
    const worldMidX = topLeftX + rotatedMid.x;
    const worldMidY = topLeftY + rotatedMid.y;
    const x = topLeftX + (snapTargetX - worldMidX);
    const y = topLeftY + (snapTargetY - worldMidY);
    const center = { x: x + cx, y: y + cy };
    const signedCenterDist = perpDistToLine(center, bestHostSeg!.a, bestHostSeg!.b);
    return { x, y, rotation: rotationDeg, signedCenterDist };
  };

  // Two valid orientations can align the same edge to a wall: 0/180 apart.
  // Pick the one that keeps the room on the same wall side as where the user
  // dragged it before snapping (this enables intentional inside/outside placement).
  const candA = computeSnapForRotation(baseRotation);
  const candB = computeSnapForRotation((baseRotation + 180) % 360);
  const draggedCenter = { x: draggedRoom.x + oldCx, y: draggedRoom.y + oldCy };
  const draggedSideDist = perpDistToLine(draggedCenter, bestHostSeg.a, bestHostSeg.b);
  const preferSign = Math.sign(draggedSideDist);
  const signA = Math.sign(candA.signedCenterDist);
  const signB = Math.sign(candB.signedCenterDist);

  let chosen = candA;
  if (preferSign !== 0) {
    const aMatches = signA === preferSign;
    const bMatches = signB === preferSign;
    if (!aMatches && bMatches) chosen = candB;
    else if (aMatches && bMatches) {
      const da = Math.abs(candA.signedCenterDist - draggedSideDist);
      const db = Math.abs(candB.signedCenterDist - draggedSideDist);
      if (db < da) chosen = candB;
    }
  } else if (Math.abs(candB.signedCenterDist) > Math.abs(candA.signedCenterDist)) {
    // If dragged exactly on wall line, pick the candidate with a clearer side.
    chosen = candB;
  }

  return {
    x: chosen.x,
    y: chosen.y,
    rotation: chosen.rotation,
  };
}
