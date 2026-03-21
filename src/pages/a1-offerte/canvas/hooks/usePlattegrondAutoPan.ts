import { useCallback, useEffect, useRef } from 'react';
import type Konva from 'konva';
import type { WallId } from '../canvasTypes';

const EDGE_THRESHOLD = 60;
const SCROLL_SPEED = 2.5;

type UsePlattegrondAutoPanArgs = {
  stageRef: React.RefObject<Konva.Stage | null>;
  size: { width: number; height: number };
  scale: number;
  stagePos: { x: number; y: number };
  setStagePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  onMoveRoom?: (id: string, x: number, y: number) => void;
  onMoveRooms?: (moves: { id: string; x: number; y: number }[]) => void;
  draggedRoomIdsRef: React.MutableRefObject<Set<string> | null>;
  draggedRoomPositionsRef: React.MutableRefObject<Record<string, { x: number; y: number }>>;
  dragFromWalls: { roomId: string; walls: WallId[] } | null;
};

export function usePlattegrondAutoPan({
  stageRef,
  size,
  scale,
  stagePos,
  setStagePos,
  onMoveRoom,
  onMoveRooms,
  draggedRoomIdsRef,
  draggedRoomPositionsRef,
  dragFromWalls,
}: UsePlattegrondAutoPanArgs) {
  const autoPanFrameRef = useRef<number | null>(null);
  const autoPanActiveRef = useRef(false);
  const stagePosRef = useRef(stagePos);

  useEffect(() => {
    stagePosRef.current = stagePos;
  }, [stagePos]);

  const stopAutoPan = useCallback(() => {
    if (autoPanFrameRef.current !== null) {
      cancelAnimationFrame(autoPanFrameRef.current);
      autoPanFrameRef.current = null;
    }
    autoPanActiveRef.current = false;
  }, []);

  const autoPanStep = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      stopAutoPan();
      return;
    }
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      stopAutoPan();
      return;
    }

    const { width, height } = size;
    let dx = 0;
    let dy = 0;

    if (pointer.x < EDGE_THRESHOLD) {
      dx = 1 - pointer.x / EDGE_THRESHOLD;
    } else if (pointer.x > width - EDGE_THRESHOLD) {
      dx = -1 + (width - pointer.x) / EDGE_THRESHOLD;
    }

    if (pointer.y < EDGE_THRESHOLD) {
      dy = 1 - pointer.y / EDGE_THRESHOLD;
    } else if (pointer.y > height - EDGE_THRESHOLD) {
      dy = -1 + (height - pointer.y) / EDGE_THRESHOLD;
    }

    let intensity = Math.max(Math.abs(dx), Math.abs(dy));
    if (!intensity) {
      stopAutoPan();
      return;
    }
    intensity = Math.pow(intensity, 1.2);

    const speed = (SCROLL_SPEED * intensity) / scale;
    const stageDx = dx * speed;
    const stageDy = dy * speed;

    const prevStage = stagePosRef.current;
    const newStageX = prevStage.x + stageDx;
    const newStageY = prevStage.y + stageDy;
    stagePosRef.current = { x: newStageX, y: newStageY };
    setStagePos({ x: newStageX, y: newStageY });

    const draggedIds = draggedRoomIdsRef.current;
    if (draggedIds && (onMoveRoom || onMoveRooms)) {
      const worldDx = stageDx / scale;
      const worldDy = stageDy / scale;
      const moves: { id: string; x: number; y: number }[] = [];
      const ids = Array.from(draggedIds);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const pos = draggedRoomPositionsRef.current[id];
        if (pos) {
          const newX = pos.x - worldDx;
          const newY = pos.y - worldDy;
          draggedRoomPositionsRef.current[id] = { x: newX, y: newY };
          moves.push({ id, x: newX, y: newY });
        }
      }
      if (moves.length > 0) {
        if (moves.length === 1) {
          onMoveRoom?.(moves[0].id, moves[0].x, moves[0].y);
        } else {
          onMoveRooms?.(moves);
        }
      }
    }

    autoPanFrameRef.current = requestAnimationFrame(autoPanStep);
  }, [size, scale, setStagePos, stageRef, stopAutoPan, onMoveRoom, onMoveRooms, draggedRoomIdsRef, draggedRoomPositionsRef]);

  const ensureAutoPan = useCallback(() => {
    if (autoPanActiveRef.current) return;
    autoPanActiveRef.current = true;
    autoPanStep();
  }, [autoPanStep]);

  const handleRoomDragMovePosition = useCallback((pointerX: number, pointerY: number, roomWorldX: number, roomWorldY: number) => {
    if (dragFromWalls) {
      draggedRoomPositionsRef.current[dragFromWalls.roomId] = { x: roomWorldX, y: roomWorldY };
    }
    const nearH = pointerX < EDGE_THRESHOLD || pointerX > size.width - EDGE_THRESHOLD;
    const nearV = pointerY < EDGE_THRESHOLD || pointerY > size.height - EDGE_THRESHOLD;
    if (nearH || nearV) {
      ensureAutoPan();
    } else {
      stopAutoPan();
    }
  }, [size.width, size.height, ensureAutoPan, stopAutoPan, dragFromWalls, draggedRoomPositionsRef]);

  return {
    EDGE_THRESHOLD,
    stopAutoPan,
    ensureAutoPan,
    handleRoomDragMovePosition,
  };
}
