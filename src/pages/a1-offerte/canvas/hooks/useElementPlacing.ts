import { useState, useEffect, useCallback } from 'react';
import Konva from 'konva';
import type { Room, RoomElement } from '../../types';
import type { WallId } from '../canvasTypes';
import { computeGhostPos } from '../canvasGeometry';

interface UseElementPlacingArgs {
  placingElement: { type: RoomElement['type']; width: number; height: number } | null | undefined;
  selectedRoomId: string | null | undefined;
  rooms: Room[];
}

export function useElementPlacing({ placingElement, selectedRoomId, rooms }: UseElementPlacingArgs) {
  const [ghostPos, setGhostPos] = useState<{ wall: WallId; position: number } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  useEffect(() => {
    if (!placingElement) setGhostPos(null);
  }, [placingElement]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!placingElement || !selectedRoomId) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;
    setGhostPos(computeGhostPos(room, pointer.x, pointer.y, stage.x(), stage.y(), stage.scaleX(), stage.scaleY()));
  }, [placingElement, selectedRoomId, rooms]);

  return {
    ghostPos,
    setGhostPos,
    selectedElementId,
    setSelectedElementId,
    handleMouseMove,
  };
}
