import { useEffect, type RefObject } from 'react';
import type { Room } from '../../types';
import type { PlattegrondCanvasHandle } from '../../canvas/PlattegrondCanvas';

interface UsePlattegrondEffectsParams {
  activeFloorId: string;
  canvasRef: RefObject<PlattegrondCanvasHandle | null>;
  selectedRoomId: string | null;
  setSelectedWallIndices: (v: number[] | ((prev: number[]) => number[])) => void;
  setSidebarView: (v: 'overview' | 'edit') => void;
  rooms: Room[];
  patchActiveFloorRoomsSilent: (updater: (rooms: Room[]) => Room[]) => void;
  selectedRoomIds: Set<string>;
  setDeleteRoomId: (id: string | null) => void;
  setDeleteMultipleRoomIds: (ids: Set<string> | null) => void;
  wallEditExitConfirmOpen: boolean;
  cancelExitWallEdit: () => void;
}

export function usePlattegrondEffects({
  activeFloorId,
  canvasRef,
  selectedRoomId,
  setSelectedWallIndices,
  setSidebarView,
  rooms,
  patchActiveFloorRoomsSilent,
  selectedRoomIds,
  setDeleteRoomId,
  setDeleteMultipleRoomIds,
  wallEditExitConfirmOpen,
  cancelExitWallEdit,
}: UsePlattegrondEffectsParams) {
  useEffect(() => {
    canvasRef.current?.goToCenter();
  }, [activeFloorId, canvasRef]);

  useEffect(() => {
    setSelectedWallIndices([]);
  }, [selectedRoomId, setSelectedWallIndices]);

  useEffect(() => {
    setSidebarView(selectedRoomId ? 'edit' : 'overview');
  }, [selectedRoomId, setSidebarView]);

  useEffect(() => {
    patchActiveFloorRoomsSilent(prev => {
      const anyChanged = prev.some(r => {
        if (r.roomType === 'normal' || !r.parentRoomId || !r.isFinalized) return false;
        const parent = prev.find(p => p.id === r.parentRoomId);
        return parent !== undefined && !parent.isFinalized;
      });
      if (!anyChanged) return prev;
      const next = prev.map(r => {
        if (r.roomType === 'normal' || !r.parentRoomId || !r.isFinalized) return r;
        const parent = prev.find(p => p.id === r.parentRoomId);
        return (parent && !parent.isFinalized) ? { ...r, isFinalized: false } : r;
      });
      if (next.length === prev.length && next.every((r, i) => r === prev[i])) return prev;
      return next;
    });
  }, [rooms, patchActiveFloorRoomsSilent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const idsToDelete =
        selectedRoomIds.size > 0
          ? selectedRoomIds
          : (selectedRoomId ? new Set<string>([selectedRoomId]) : new Set<string>());

      if (idsToDelete.size === 0) return;

      if (idsToDelete.size === 1) {
        const onlyId = Array.from(idsToDelete)[0];
        setDeleteRoomId(onlyId);
      } else {
        setDeleteMultipleRoomIds(new Set(idsToDelete));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRoomId, selectedRoomIds, setDeleteRoomId, setDeleteMultipleRoomIds]);

  useEffect(() => {
    if (!wallEditExitConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelExitWallEdit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wallEditExitConfirmOpen, cancelExitWallEdit]);
}
