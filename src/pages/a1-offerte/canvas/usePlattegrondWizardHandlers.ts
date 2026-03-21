import { useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { Room } from '../types';
import {
  computeWizardCarve,
  computeWizardFill,
  getWorldVertices,
  safeGapCarveDistance,
  safeGapFillDistance,
  snapToRooms,
} from './canvasUtils';
import type { GapInfo } from './canvasTypes';
import { PX_PER_M } from './canvasTypes';

type Args = {
  rooms: Room[];
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
  beginBatch?: () => void;
  endBatch?: () => void;
  wizardGaps: GapInfo[];
  setWizardPreview: React.Dispatch<React.SetStateAction<{ vertices: number[] } | null>>;
  selectedRoomId: string | null;
  scale: number;
};

export function usePlattegrondWizardHandlers({
  rooms,
  onUpdateRoom,
  beginBatch,
  endBatch,
  wizardGaps,
  setWizardPreview,
  selectedRoomId,
  scale,
}: Args) {
  const wizardGapsRef = useRef(wizardGaps);
  wizardGapsRef.current = wizardGaps;

  const handleWizardFill = useCallback((gapInfo: GapInfo) => {
    if (!onUpdateRoom) return;
    const targetRoom = rooms.find(r => r.id === gapInfo.roomId);
    if (!targetRoom) return;

    const safeT = safeGapFillDistance(targetRoom, gapInfo, rooms);
    if (safeT <= 0) return;

    const scaledGap: GapInfo = {
      ...gapInfo,
      deltaPx: {
        x: gapInfo.deltaPx.x * safeT,
        y: gapInfo.deltaPx.y * safeT,
      },
    };

    beginBatch?.();
    const fill = computeWizardFill(targetRoom, scaledGap);
    if (!fill) {
      endBatch?.();
      return;
    }
    const updatedRooms = rooms.map(r => r.id === targetRoom.id ? fill : r);
    const snapped = snapToRooms(targetRoom.id, fill.x, fill.y, updatedRooms);
    flushSync(() => {
      onUpdateRoom(targetRoom.id, {
        vertices: fill.vertices,
        x: snapped.x,
        y: snapped.y,
        length: fill.length,
        width: fill.width,
        wallLengths: fill.wallLengths,
      });
    });
    endBatch?.();
    setWizardPreview(null);
  }, [rooms, onUpdateRoom, beginBatch, endBatch, setWizardPreview]);

  const handleWizardCarve = useCallback((gapInfo: GapInfo) => {
    if (!onUpdateRoom) return;
    const targetRoom = rooms.find(r => r.id === gapInfo.roomId);
    if (!targetRoom) return;

    const safeT = safeGapCarveDistance(targetRoom, gapInfo);
    if (safeT <= 0) return;

    const scaledGap: GapInfo = {
      ...gapInfo,
      deltaPx: {
        x: gapInfo.deltaPx.x * safeT,
        y: gapInfo.deltaPx.y * safeT,
      },
    };

    beginBatch?.();
    const carved = computeWizardCarve(targetRoom, scaledGap);
    if (!carved) {
      endBatch?.();
      return;
    }
    const updatedRooms = rooms.map(r => r.id === targetRoom.id ? carved : r);
    const snapped = snapToRooms(targetRoom.id, carved.x, carved.y, updatedRooms);
    flushSync(() => {
      onUpdateRoom(targetRoom.id, {
        vertices: carved.vertices,
        x: snapped.x,
        y: snapped.y,
        length: carved.length,
        width: carved.width,
        wallLengths: carved.wallLengths,
      });
    });
    endBatch?.();
    setWizardPreview(null);
  }, [rooms, onUpdateRoom, beginBatch, endBatch, setWizardPreview]);

  const handleWizardFillRef = useRef(handleWizardFill);
  handleWizardFillRef.current = handleWizardFill;

  const handleWizardHoverStart = useCallback((gapInfo: GapInfo, mode: 'fill' | 'carve') => {
    const targetRoom = rooms.find(r => r.id === gapInfo.roomId);
    if (!targetRoom) return;
    const safeT = mode === 'fill'
      ? safeGapFillDistance(targetRoom, gapInfo, rooms)
      : safeGapCarveDistance(targetRoom, gapInfo);
    if (safeT <= 0) return;
    const scaledGap: GapInfo = {
      ...gapInfo,
      deltaPx: {
        x: gapInfo.deltaPx.x * safeT,
        y: gapInfo.deltaPx.y * safeT,
      },
    };
    const fill = mode === 'fill'
      ? computeWizardFill(targetRoom, scaledGap)
      : computeWizardCarve(targetRoom, scaledGap);
    if (!fill) return;
    const pts = getWorldVertices(fill).flatMap(v => [v.x, v.y]);
    setWizardPreview({ vertices: pts });
  }, [rooms, setWizardPreview]);

  const handleWizardHoverEnd = useCallback(() => {
    setWizardPreview(null);
  }, [setWizardPreview]);

  const selectedSpecialActionTarget = useMemo(() => {
    if (!selectedRoomId || wizardGaps.length === 0) return null;
    const selected = rooms.find(r => r.id === selectedRoomId);
    if (!selected || selected.roomType === 'normal') return null;

    const rot = selected.rotation || 0;
    const sw = (rot === 90 || rot === 270 ? selected.width : selected.length) * PX_PER_M;
    const sh = (rot === 90 || rot === 270 ? selected.length : selected.width) * PX_PER_M;
    const scx = selected.x + sw / 2;
    const scy = selected.y + sh / 2;

    const byTarget = wizardGaps.filter(g => g.targetRoomId === selected.id);
    const pool = byTarget.length > 0 ? byTarget : wizardGaps;
    const nearest = pool.reduce((best, g) => {
      const dx = g.wizardWorldPos.x - scx;
      const dy = g.wizardWorldPos.y - scy;
      const d2 = dx * dx + dy * dy;
      if (!best || d2 < best.d2) return { gap: g, d2 };
      return best;
    }, null as null | { gap: GapInfo; d2: number });
    if (!nearest) return null;

    const topOffsetPx = 26;
    const uiPos = { x: scx, y: selected.y - topOffsetPx / Math.max(scale, 0.2) };
    return { ...nearest.gap, wizardWorldPos: uiPos } as GapInfo;
  }, [rooms, selectedRoomId, wizardGaps, scale]);

  return {
    handleWizardFill,
    handleWizardCarve,
    handleWizardHoverStart,
    handleWizardHoverEnd,
    wizardGapsRef,
    handleWizardFillRef,
    selectedSpecialActionTarget,
  };
}
