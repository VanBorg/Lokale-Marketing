import type { Room } from '../../types';
import type { GapInfo } from '../canvasTypes';
import { computeWorldWallSegments } from '../wallSegments';
import { computeWizardFill } from './gapFill';

export function segmentsIntersect(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
): boolean {
  const d1x = ax2 - ax1;
  const d1y = ay2 - ay1;
  const d2x = bx2 - bx1;
  const d2y = by2 - by1;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((bx1 - ax1) * d2y - (by1 - ay1) * d2x) / cross;
  const u = ((bx1 - ax1) * d1y - (by1 - ay1) * d1x) / cross;
  const EPS = 0.002;
  return t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS;
}

export function wizardResultCollides(filledRoom: Room, allRooms: Room[]): boolean {
  const segs = computeWorldWallSegments(filledRoom);
  for (const other of allRooms) {
    if (other.id === filledRoom.id) continue;
    const otherSegs = computeWorldWallSegments(other);
    for (const s of segs) {
      for (const os of otherSegs) {
        if (segmentsIntersect(s.p1.x, s.p1.y, s.p2.x, s.p2.y, os.p1.x, os.p1.y, os.p2.x, os.p2.y)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function safeGapFillDistance(targetRoom: Room, gap: GapInfo, allRooms: Room[]): number {
  const others = allRooms.filter(r => r.id !== targetRoom.id);

  const fullGap: GapInfo = { ...gap, deltaPx: { ...gap.deltaPx } };
  const fullRoom = computeWizardFill(targetRoom, fullGap);
  if (fullRoom && !wizardResultCollides(fullRoom, others)) return 1;

  let lo = 0;
  let hi = 1;
  const STEPS = 8;

  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2;
    const testGap: GapInfo = {
      ...gap,
      deltaPx: {
        x: gap.deltaPx.x * mid,
        y: gap.deltaPx.y * mid,
      },
    };
    const testRoom = computeWizardFill(targetRoom, testGap);
    if (!testRoom || wizardResultCollides(testRoom, others)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return lo < 1e-4 ? 0 : lo;
}
