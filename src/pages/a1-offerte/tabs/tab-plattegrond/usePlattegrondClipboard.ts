import { useState, useCallback } from 'react';
import type { Room } from '../../types';
import { detectSubRooms } from '../../types';

interface UsePlattegrondClipboardParams {
  selectedRoom: Room | null;
  updateActiveFloorRooms: (updater: (rooms: Room[]) => Room[]) => void;
  setSelectedRoomId: (id: string | null) => void;
}

export function usePlattegrondClipboard({
  selectedRoom,
  updateActiveFloorRooms,
  setSelectedRoomId,
}: UsePlattegrondClipboardParams) {
  const [clipboard, setClipboard] = useState<Room | null>(null);
  const [isCut, setIsCut] = useState(false);
  const [cutRoomId, setCutRoomId] = useState<string | null>(null);

  const duplicateRoom = useCallback(() => {
    if (!selectedRoom) return;
    const copy: Room = {
      ...structuredClone(selectedRoom),
      id: crypto.randomUUID(),
      name: `${selectedRoom.name} (kopie)`,
      x: selectedRoom.x + 20,
      y: selectedRoom.y + 20,
    };
    copy.elements = copy.elements.map(el => ({ ...el, id: crypto.randomUUID() }));
    updateActiveFloorRooms(prev => detectSubRooms([...prev, copy]));
    setSelectedRoomId(copy.id);
  }, [selectedRoom, updateActiveFloorRooms, setSelectedRoomId]);

  const copyRoom = useCallback(() => {
    if (!selectedRoom) return;
    setClipboard(structuredClone(selectedRoom));
    setIsCut(false);
    setCutRoomId(null);
  }, [selectedRoom]);

  const cutRoom = useCallback(() => {
    if (!selectedRoom) return;
    setClipboard(structuredClone(selectedRoom));
    setCutRoomId(selectedRoom.id);
    setIsCut(true);
  }, [selectedRoom]);

  const pasteRoom = useCallback(() => {
    if (!clipboard) return;
    const pasted: Room = {
      ...structuredClone(clipboard),
      id: crypto.randomUUID(),
      name: isCut ? clipboard.name : `${clipboard.name} (kopie)`,
      x: clipboard.x + 20,
      y: clipboard.y + 20,
    };
    pasted.elements = pasted.elements.map(el => ({ ...el, id: crypto.randomUUID() }));
    updateActiveFloorRooms(prev => {
      let next = [...prev, pasted];
      if (isCut && cutRoomId) {
        next = next.filter(r => r.id !== cutRoomId);
      }
      return detectSubRooms(next);
    });
    setSelectedRoomId(pasted.id);
    if (isCut) {
      setIsCut(false);
      setCutRoomId(null);
    }
    setClipboard(prev => prev ? { ...prev, x: prev.x + 20, y: prev.y + 20 } : null);
  }, [clipboard, isCut, cutRoomId, updateActiveFloorRooms, setSelectedRoomId]);

  return {
    clipboard,
    isCut,
    cutRoomId,
    duplicateRoom,
    copyRoom,
    cutRoom,
    pasteRoom,
  };
}
