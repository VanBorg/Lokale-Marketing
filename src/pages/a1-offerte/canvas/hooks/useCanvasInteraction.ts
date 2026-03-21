import { useState, useCallback, useRef, useEffect } from 'react';
import Konva from 'konva';
import type { Room } from '../../types';
import type { WallId } from '../canvasTypes';
import { boundingSize } from '../canvasGeometry';

interface UseCanvasInteractionArgs {
  rooms: Room[];
  selectedRoomId: string | null | undefined;
  selectedRoomIds?: Set<string>;
  onSelectedRoomIdsChange?: (ids: Set<string>) => void;
  onSelectRoom: (id: string | null) => void;
  onMoveRoom: (id: string, x: number, y: number) => void;
  onMoveRooms?: (moves: { id: string; x: number; y: number }[]) => void;
  pendingSpecialRoom: { type: string; name: string } | null;
  pendingTargetRoomId: string | null;
  onSelectTargetRoom: (roomId: string) => void;
  shouldConfirmClearRoomSelection?: () => boolean;
  onRequestClearRoomSelectionConfirm?: () => void;
  justFinishedDragRef: React.MutableRefObject<boolean>;
}

export function useCanvasInteraction({
  rooms,
  selectedRoomId,
  selectedRoomIds: externalSelectedRoomIds,
  onSelectedRoomIdsChange,
  onSelectRoom,
  onMoveRoom,
  onMoveRooms,
  pendingSpecialRoom,
  pendingTargetRoomId,
  onSelectTargetRoom,
  shouldConfirmClearRoomSelection,
  onRequestClearRoomSelectionConfirm,
  justFinishedDragRef,
}: UseCanvasInteractionArgs) {
  const [internalSelectedRoomIds, setInternalSelectedRoomIds] = useState<Set<string>>(new Set());
  const selectedRoomIdsValue = externalSelectedRoomIds ?? internalSelectedRoomIds;

  const setSelectedRoomIds = useCallback((ids: Set<string>) => {
    if (onSelectedRoomIdsChange) {
      onSelectedRoomIdsChange(ids);
    } else {
      setInternalSelectedRoomIds(ids);
    }
  }, [onSelectedRoomIdsChange]);

  const [multiDragDelta, setMultiDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const multiDragOriginIdRef = useRef<string | null>(null);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const internalSelectRef = useRef(false);
  const [modifierHeld, setModifierHeld] = useState(false);
  const lastTargetPickRef = useRef<{ id: string; t: number } | null>(null);

  useEffect(() => {
    const update = (e: KeyboardEvent) => setModifierHeld(e.ctrlKey || e.metaKey || e.shiftKey);
    const blur = () => setModifierHeld(false);
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', update);
      window.removeEventListener('keyup', update);
      window.removeEventListener('blur', blur);
    };
  }, []);

  useEffect(() => {
    if (internalSelectRef.current) {
      internalSelectRef.current = false;
      return;
    }
    setSelectedRoomIds(selectedRoomId ? new Set([selectedRoomId]) : new Set());
  }, [selectedRoomId, setSelectedRoomIds]);

  useEffect(() => {
    const roomIds = new Set(rooms.map(r => r.id));
    const filtered = new Set<string>(Array.from(selectedRoomIdsValue).filter(id => roomIds.has(id)));
    if (filtered.size !== selectedRoomIdsValue.size) {
      setSelectedRoomIds(filtered);
    }
  }, [rooms, selectedRoomIdsValue, setSelectedRoomIds]);

  const selectRoom = useCallback((id: string | null) => {
    setSelectedRoomIds(id ? new Set([id]) : new Set());
    setMultiDragDelta(null);
    multiDragOriginIdRef.current = null;
    internalSelectRef.current = true;
    onSelectRoom(id);
  }, [onSelectRoom, setSelectedRoomIds]);

  const selectRoomForCanvas = useCallback((id: string | null) => {
    if (pendingSpecialRoom && id) {
      const now = Date.now();
      const last = lastTargetPickRef.current;
      if (last && last.id === id && now - last.t < 80) return;
      lastTargetPickRef.current = { id, t: now };
      onSelectTargetRoom(id);
      return;
    }
    lastTargetPickRef.current = null;
    selectRoom(id);
  }, [pendingSpecialRoom, onSelectTargetRoom, selectRoom]);

  const handleRoomClick = useCallback((roomId: string, evt: MouseEvent) => {
    if (pendingSpecialRoom) {
      const now = Date.now();
      const last = lastTargetPickRef.current;
      if (last && last.id === roomId && now - last.t < 80) return;
      lastTargetPickRef.current = { id: roomId, t: now };
      onSelectTargetRoom(roomId);
      return;
    }
    if (evt.ctrlKey || evt.metaKey) {
      const clickedRoom = rooms.find(r => r.id === roomId);
      const clickedFinalized = !!clickedRoom?.isFinalized;
      const currentHasFinalized = selectedRoomIdsValue.size > 0 && Array.from(selectedRoomIdsValue).some(rid => {
        const r = rooms.find(r => r.id === rid);
        return r?.isFinalized;
      });

      if (selectedRoomIdsValue.size > 0 && clickedFinalized !== currentHasFinalized) {
        setSelectedRoomIds(new Set([roomId]));
        internalSelectRef.current = true;
        onSelectRoom(roomId);
        return;
      }

      const isInSet = selectedRoomIdsValue.has(roomId);
      if (isInSet) {
        const next = new Set(selectedRoomIdsValue);
        next.delete(roomId);
        const remaining = Array.from(next);
        if (selectedRoomId === roomId && remaining.length === 0) {
          if (shouldConfirmClearRoomSelection?.()) {
            onRequestClearRoomSelectionConfirm?.();
            return;
          }
        }
        setSelectedRoomIds(next);
        if (selectedRoomId === roomId) {
          internalSelectRef.current = true;
          onSelectRoom(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        const next = new Set(selectedRoomIdsValue);
        next.add(roomId);
        if (selectedRoomId) next.add(selectedRoomId);
        setSelectedRoomIds(next);
        internalSelectRef.current = true;
        onSelectRoom(roomId);
      }
      return;
    }

    if (evt.shiftKey && selectedRoomId) {
      const primaryRoom = rooms.find(r => r.id === selectedRoomId);
      const primaryFinalized = !!primaryRoom?.isFinalized;
      const startIdx = rooms.findIndex(r => r.id === selectedRoomId);
      const endIdx = rooms.findIndex(r => r.id === roomId);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = new Set(
          rooms.slice(from, to + 1)
            .filter(r => !!r.isFinalized === primaryFinalized)
            .map(r => r.id)
        );
        setSelectedRoomIds(rangeIds);
        internalSelectRef.current = true;
        onSelectRoom(roomId);
      }
      return;
    }

    selectRoom(roomId);
  }, [pendingSpecialRoom, onSelectTargetRoom, selectedRoomIdsValue, selectedRoomId, rooms, onSelectRoom, selectRoom, shouldConfirmClearRoomSelection, onRequestClearRoomSelectionConfirm]);

  const handleRoomDragMove = useCallback((roomId: string, dx: number, dy: number) => {
    multiDragOriginIdRef.current = roomId;
    setMultiDragDelta({ dx, dy });
  }, []);

  const handleMoveRoom = useCallback((id: string, x: number, y: number) => {
    setMultiDragDelta(null);
    multiDragOriginIdRef.current = null;
    if (selectedRoomIdsValue.size > 1 && selectedRoomIdsValue.has(id) && onMoveRooms) {
      const room = rooms.find(r => r.id === id);
      if (!room) { onMoveRoom(id, x, y); return; }
      const dx = x - room.x;
      const dy = y - room.y;
      const moves = Array.from(selectedRoomIdsValue)
        .map(rid => {
          const r = rooms.find(r => r.id === rid);
          if (!r || r.isFinalized) return null;
          return { id: rid, x: rid === id ? x : r.x + dx, y: rid === id ? y : r.y + dy };
        })
        .filter((m): m is { id: string; x: number; y: number } => m !== null);
      if (moves.length > 0) onMoveRooms(moves);
    } else {
      onMoveRoom(id, x, y);
    }
  }, [selectedRoomIdsValue, rooms, onMoveRoom, onMoveRooms]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if ((e.evt.ctrlKey || e.evt.metaKey) && e.target === e.target.getStage()) {
      const stage = e.target.getStage()!;
      stage.draggable(false);
      const pos = stage.getPointerPosition()!;
      const worldX = (pos.x - stage.x()) / stage.scaleX();
      const worldY = (pos.y - stage.y()) / stage.scaleY();
      setMarquee({ startX: worldX, startY: worldY, endX: worldX, endY: worldY });
    }
  }, []);

  const handleStageClick = useCallback((
    e: Konva.KonvaEventObject<MouseEvent>,
    opts: {
      placingElement: boolean;
      selectedRoomId: string | null | undefined;
      ghostPos: { wall: WallId; position: number } | null;
      onPlaceElement?: (roomId: string, wall: WallId, position: number) => void;
      pendingTargetRoomId: string | null;
      onCancelPendingSpecial: () => void;
      setSelectedElementId: (id: string | null) => void;
    }
  ) => {
    if (justFinishedDragRef.current) return;
    const { placingElement: pe, selectedRoomId: srId, ghostPos, onPlaceElement, onCancelPendingSpecial, setSelectedElementId } = opts;
    if (pe && srId && ghostPos) { onPlaceElement?.(srId, ghostPos.wall, ghostPos.position); return; }
    const stage = e.target.getStage();
    if (e.target === stage && (pendingSpecialRoom || pendingTargetRoomId)) {
      onCancelPendingSpecial();
      return;
    }
    setSelectedElementId(null);
    if (e.target === stage) selectRoom(null);
  }, [justFinishedDragRef, pendingSpecialRoom, pendingTargetRoomId, selectRoom]);

  const onMarqueeMouseUp = useCallback(() => {
    if (!marquee) return false;
    const left = Math.min(marquee.startX, marquee.endX);
    const right = Math.max(marquee.startX, marquee.endX);
    const top = Math.min(marquee.startY, marquee.endY);
    const bottom = Math.max(marquee.startY, marquee.endY);

    const currentHasFinalized = Array.from(selectedRoomIdsValue).some(rid => {
      const r = rooms.find(r => r.id === rid);
      return r?.isFinalized;
    });

    const newSelection = new Set<string>();
    for (const room of rooms) {
      if (currentHasFinalized && !room.isFinalized) continue;
      if (!currentHasFinalized && room.isFinalized) continue;
      const { w, h } = boundingSize(room);
      if (room.x < right && room.x + w > left && room.y < bottom && room.y + h > top) {
        newSelection.add(room.id);
      }
    }

    if (newSelection.size > 0) {
      setSelectedRoomIds(newSelection);
      const firstId = Array.from(newSelection)[0];
      internalSelectRef.current = true;
      onSelectRoom(firstId);
    } else {
      if (shouldConfirmClearRoomSelection?.()) {
        onRequestClearRoomSelectionConfirm?.();
      } else {
        setSelectedRoomIds(newSelection);
        internalSelectRef.current = true;
        onSelectRoom(null);
      }
    }
    justFinishedDragRef.current = true;
    requestAnimationFrame(() => { justFinishedDragRef.current = false; });
    setMarquee(null);
    return true;
  }, [marquee, rooms, selectedRoomIdsValue, setSelectedRoomIds, onSelectRoom, shouldConfirmClearRoomSelection, onRequestClearRoomSelectionConfirm, justFinishedDragRef]);

  return {
    selectedRoomIdsValue,
    setSelectedRoomIds,
    multiDragDelta,
    setMultiDragDelta,
    multiDragOriginIdRef,
    marquee,
    setMarquee,
    internalSelectRef,
    modifierHeld,
    lastTargetPickRef,
    selectRoom,
    selectRoomForCanvas,
    handleRoomClick,
    handleRoomDragMove,
    handleMoveRoom,
    handleStageMouseDown,
    handleStageClick,
    onMarqueeMouseUp,
  };
}
