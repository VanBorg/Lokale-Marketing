import { useState, useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { Room, RoomType } from '../../types';
import { detectSubRooms } from '../../types';
import { getSpecialRoomConfig } from '../../specialRooms';
import { PX_PER_M } from '../../canvas/canvasTypes';
import type { PlattegrondCanvasHandle } from '../../canvas/PlattegrondCanvas';
import type { PendingSpecialRoom, PlacingElement } from './types';
import { buildSpecialTypeRoom } from './buildPlattegrondRooms';

interface UseSpecialRoomPlacementParams {
  rooms: Room[];
  roomCount: number;
  updateActiveFloorRooms: (updater: (rooms: Room[]) => Room[]) => void;
  canvasRef: RefObject<PlattegrondCanvasHandle | null>;
  setSelectedRoomId: (id: string | null) => void;
  setPlacingElement: Dispatch<SetStateAction<PlacingElement>>;
  updateRoom: (id: string, updates: Partial<Room>) => void;
}

export function useSpecialRoomPlacement({
  rooms,
  roomCount,
  updateActiveFloorRooms,
  canvasRef,
  setSelectedRoomId,
  setPlacingElement,
  updateRoom,
}: UseSpecialRoomPlacementParams) {
  const [pendingSpecialRoom, setPendingSpecialRoom] = useState<PendingSpecialRoom | null>(null);
  const [pendingTargetRoomId, setPendingTargetRoomId] = useState<string | null>(null);

  const addSpecialRoom = useCallback(
    (type: RoomType, name: string, length: number, width: number, worldX?: number, worldY?: number) => {
      const spawn = canvasRef.current?.getSpawnPosition?.();
      const newRoom = buildSpecialTypeRoom(type, name, length, width, roomCount, spawn, worldX, worldY);
      updateActiveFloorRooms(prev => detectSubRooms([...prev, newRoom]));
      setSelectedRoomId(newRoom.id);
      setPlacingElement(null);
      setPendingSpecialRoom(null);
      setPendingTargetRoomId(null);
    },
    [roomCount, updateActiveFloorRooms, canvasRef, setSelectedRoomId, setPlacingElement],
  );

  const cancelPendingSpecial = useCallback(() => {
    setPendingSpecialRoom(null);
    setPendingTargetRoomId(null);
  }, []);

  const startPendingSpecialRoom = useCallback((type: RoomType, name: string, length: number, width: number) => {
    setPendingSpecialRoom({ type, name, length, width });
    setPendingTargetRoomId(null);
    setPlacingElement(null);
  }, [setPlacingElement]);

  const handleSelectTargetRoom = useCallback(
    (roomId: string) => {
      const target = rooms.find(r => r.id === roomId);
      if (!target || !pendingSpecialRoom) return;

      const placeOnTarget = (t: Room) => {
        const config = getSpecialRoomConfig(pendingSpecialRoom.type);
        const resolvedLength = config?.defaultLength ?? pendingSpecialRoom.length;
        const resolvedWidth = config?.defaultWidth ?? pendingSpecialRoom.width;
        const x = t.x + (t.length * PX_PER_M) / 2 - (resolvedLength * PX_PER_M) / 2;
        const y = t.y + (t.width * PX_PER_M) / 2 - (resolvedWidth * PX_PER_M) / 2;
        addSpecialRoom(
          pendingSpecialRoom.type,
          pendingSpecialRoom.name,
          pendingSpecialRoom.length,
          pendingSpecialRoom.width,
          x,
          y,
        );
      };

      if (pendingTargetRoomId !== null) {
        if (target.isFinalized) {
          setPendingTargetRoomId(roomId);
        } else {
          placeOnTarget(target);
        }
        return;
      }

      if (!target.isFinalized) {
        placeOnTarget(target);
      } else {
        setPendingTargetRoomId(roomId);
      }
    },
    [rooms, pendingSpecialRoom, pendingTargetRoomId, addSpecialRoom],
  );

  const confirmPlaceOnFinalizedTarget = useCallback(() => {
    if (!pendingSpecialRoom || !pendingTargetRoomId) return;
    const target = rooms.find(r => r.id === pendingTargetRoomId);
    if (!target) {
      cancelPendingSpecial();
      return;
    }
    updateRoom(pendingTargetRoomId, { isFinalized: false });
    const config = getSpecialRoomConfig(pendingSpecialRoom.type);
    const resolvedLength = config?.defaultLength ?? pendingSpecialRoom.length;
    const resolvedWidth = config?.defaultWidth ?? pendingSpecialRoom.width;
    const x = target.x + (target.length * PX_PER_M) / 2 - (resolvedLength * PX_PER_M) / 2;
    const y = target.y + (target.width * PX_PER_M) / 2 - (resolvedWidth * PX_PER_M) / 2;
    addSpecialRoom(
      pendingSpecialRoom.type,
      pendingSpecialRoom.name,
      pendingSpecialRoom.length,
      pendingSpecialRoom.width,
      x,
      y,
    );
  }, [pendingSpecialRoom, pendingTargetRoomId, rooms, updateRoom, addSpecialRoom, cancelPendingSpecial]);

  return {
    pendingSpecialRoom,
    pendingTargetRoomId,
    addSpecialRoom,
    cancelPendingSpecial,
    startPendingSpecialRoom,
    handleSelectTargetRoom,
    confirmPlaceOnFinalizedTarget,
  };
}
