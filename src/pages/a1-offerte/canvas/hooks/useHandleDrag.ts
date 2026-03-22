import { useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Konva from 'konva';
import type { Room } from '../../types';
import type { DraggingHandle, WallId } from '../canvasTypes';
import { computeHandleDrag } from '../canvasResize';
import { snapToRooms } from '../canvasSnapping';

interface UseHandleDragArgs {
  rooms: Room[];
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
  beginBatch?: () => void;
  endBatch?: () => void;
  justFinishedDragRef: React.MutableRefObject<boolean>;
}

export function useHandleDrag({ rooms, onUpdateRoom, beginBatch, endBatch, justFinishedDragRef }: UseHandleDragArgs) {
  const [draggingHandle, setDraggingHandleRaw] = useState<DraggingHandle>(null);
  const [snapHighlight, setSnapHighlight] = useState<{ roomId: string; wall: string } | null>(null);
  const [dragFromWalls, setDragFromWalls] = useState<{ roomId: string; walls: WallId[] } | null>(null);

  const setDraggingHandle = useCallback((handle: DraggingHandle) => {
    if (handle && !draggingHandle) beginBatch?.();
    setDraggingHandleRaw(handle);
  }, [draggingHandle, beginBatch]);

  const handleHandleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!draggingHandle || !onUpdateRoom) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const worldX = (pos.x - stage.x()) / stage.scaleX();
    const worldY = (pos.y - stage.y()) / stage.scaleY();
    const result = computeHandleDrag(draggingHandle.handle, draggingHandle.startRoom,
      worldX - draggingHandle.startWorldPos.x, worldY - draggingHandle.startWorldPos.y);
    onUpdateRoom(draggingHandle.roomId, {
      x: result.x, y: result.y,
      wallLengths: result.wallLengths,
      vertices: result.vertices,
      length: result.length,
      width: result.width,
    });
  }, [draggingHandle, onUpdateRoom]);

  const onHandleMouseUp = useCallback(() => {
    if (!draggingHandle) return false;
    const roomId = draggingHandle.roomId;
    const room = rooms.find(r => r.id === roomId);
    if (room && onUpdateRoom) {
      const snapped = snapToRooms(roomId, room.x, room.y, rooms);
      if (snapped.x !== room.x || snapped.y !== room.y) {
        flushSync(() => {
          onUpdateRoom(roomId, { x: snapped.x, y: snapped.y });
        });
      }
    }
    endBatch?.();
    setDraggingHandleRaw(null);
    justFinishedDragRef.current = true;
    requestAnimationFrame(() => { justFinishedDragRef.current = false; });
    return true;
  }, [draggingHandle, rooms, onUpdateRoom, endBatch, justFinishedDragRef]);

  return {
    draggingHandle,
    setDraggingHandle,
    snapHighlight,
    setSnapHighlight,
    dragFromWalls,
    setDragFromWalls,
    handleHandleMouseMove,
    onHandleMouseUp,
  };
}
