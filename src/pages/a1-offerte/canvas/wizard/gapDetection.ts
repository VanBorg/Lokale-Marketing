import type { Room } from '../../types';
import { isSpecialRoomType } from '../../types';
import type { GapInfo } from '../canvasTypes';
import { getShapeConfig } from '../shapes/index';
import { buildWorldEdges, findFacingEdgePairs } from './edgeDetection';
import { getWorldVertices } from './worldSpace';

const GAP_MAX_PX = 120;
const GAP_MIN_PX = 1;
const OVERLAP_MIN_PX = 2;
const WIZARD_OFFSET_PX = 12;

const UNSUPPORTED_SHAPE_IDS = new Set(['cirkel', 'halfcircle', 'halfcirkel', 'ruit', 'diamant']);

function isUnsupportedWizardShape(room: Room): boolean {
  const id = room.shape?.toLowerCase?.() ?? '';
  return UNSUPPORTED_SHAPE_IDS.has(id);
}

function wallMidpointWorld(room: Room, wallIndex: number): { x: number; y: number } {
  const w = getWorldVertices(room);
  const n = w.length;
  if (n < 2) return { x: room.x, y: room.y };
  const a = w[wallIndex % n];
  const b = w[(wallIndex + 1) % n];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function detectRoomGaps(selectedRoom: Room, allRooms: Room[]): GapInfo[] {
  if (selectedRoom.isFinalized) return [];
  if (selectedRoom.roomType && isSpecialRoomType(selectedRoom.roomType)) {
    return [];
  }
  if (isUnsupportedWizardShape(selectedRoom)) return [];

  const config = getShapeConfig(selectedRoom.shape);
  const innerWalls: Set<number> = new Set(
    Array.isArray(config.INNER_WALL_INDICES) ? config.INNER_WALL_INDICES : [],
  );

  const gaps: GapInfo[] = [];
  /** Debug: raw pairs vs inner-wall skips (hypotheses H1–H4). */
  const pairsTrace: Array<{
    refId: string;
    wallA: number;
    gapPx: number;
    overlapPx: number;
    skippedInner: boolean;
    skippedZeroDelta: boolean;
  }> = [];

  for (const other of allRooms) {
    if (other.id === selectedRoom.id) continue;
    if (!other.isFinalized) continue;
    if (isUnsupportedWizardShape(other)) continue;

    const pairs = findFacingEdgePairs(selectedRoom, other, GAP_MIN_PX, GAP_MAX_PX, OVERLAP_MIN_PX);
    for (const p of pairs) {
      const skipInner = innerWalls.has(p.wallIndexA);
      const { x: dx, y: dy } = p.deltaPx;
      const len = Math.hypot(dx, dy);
      const skipZero = len < 1e-6;
      pairsTrace.push({
        refId: other.id,
        wallA: p.wallIndexA,
        gapPx: p.gapPx,
        overlapPx: p.overlapPx,
        skippedInner: skipInner,
        skippedZeroDelta: skipZero,
      });
      if (skipInner) continue;
      if (skipZero) continue;

      const nx = dx / len;
      const ny = dy / len;
      const mid = wallMidpointWorld(selectedRoom, p.wallIndexA);

      gaps.push({
        roomId: selectedRoom.id,
        targetRoomId: other.id,
        wallIndex: p.wallIndexA,
        refWallIndex: p.wallIndexB,
        direction: { nx, ny },
        wizardWorldPos: {
          x: mid.x + nx * WIZARD_OFFSET_PX,
          y: mid.y + ny * WIZARD_OFFSET_PX,
        },
        deltaPx: { ...p.deltaPx },
      });
    }
  }

  // #region agent log
  {
    const worldEdgeCount = buildWorldEdges(selectedRoom).length;
    fetch('http://127.0.0.1:7644/ingest/073d4520-a64b-4ad6-8bfd-6e2322419c20', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b72d1f' },
      body: JSON.stringify({
        sessionId: 'b72d1f',
        runId: 'pre-fix',
        hypothesisId: 'H1_H2_H3_H4_H5',
        location: 'gapDetection.ts:detectRoomGaps',
        message: 'wizard_gap_trace',
        data: {
          roomId: selectedRoom.id,
          shape: selectedRoom.shape,
          rotation: selectedRoom.rotation ?? 0,
          innerWallIndices: Array.from(innerWalls),
          worldEdgeCount,
          gapConstants: { GAP_MIN_PX, GAP_MAX_PX, OVERLAP_MIN_PX },
          finalizedOtherCount: allRooms.filter(
            o => o.id !== selectedRoom.id && o.isFinalized && !isUnsupportedWizardShape(o),
          ).length,
          pairsTrace,
          emittedGapCount: gaps.length,
          emittedWallIndices: gaps.map(g => g.wallIndex),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  return gaps;
}
