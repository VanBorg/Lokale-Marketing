import { useState, useCallback, useRef } from 'react';
import {
  Room,
  RoomElement,
  detectSubRooms,
} from '../../types';
import type { PlattegrondCanvasHandle } from '../../canvas/PlattegrondCanvas';
import type { PlacingElement, TabPlattegrondProps } from './types';
import { mergeRoomPartialUpdate } from './mergeRoomPartialUpdate';
import { applySpecialRoomMoveConstraints } from './applySpecialRoomMoveConstraints';
import { buildStandardShapeRoom, buildFreeFormRoom } from './buildPlattegrondRooms';
import { usePlattegrondClipboard } from './usePlattegrondClipboard';
import { useSpecialRoomPlacement } from './useSpecialRoomPlacement';
import { usePlattegrondEffects } from './usePlattegrondEffects';

export function useTabPlattegrond({
  floors,
  setFloors,
  patchActiveFloorRoomsSilent,
  activeFloorId,
  setActiveFloorId,
  setActiveTab,
  beginBatch,
  endBatch,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: TabPlattegrondProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [lastShape, setLastShape] = useState<string | null>(null);
  const [placingElement, setPlacingElement] = useState<PlacingElement>(null);
  const [selectedWallIndices, setSelectedWallIndices] = useState<number[]>([]);

  const [deleteFloorId, setDeleteFloorId] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [deleteMultipleRoomIds, setDeleteMultipleRoomIds] = useState<Set<string> | null>(null);
  const [showFreeFormBuilder, setShowFreeFormBuilder] = useState(false);
  const [sidebarView, setSidebarView] = useState<'overview' | 'edit'>('overview');
  const [wallEditExitConfirmOpen, setWallEditExitConfirmOpen] = useState(false);

  const canvasRef = useRef<PlattegrondCanvasHandle | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const activeFloor = floors.find(f => f.id === activeFloorId)!;
  const rooms = activeFloor.rooms;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const totalRooms = floors.reduce((sum, f) => sum + f.rooms.length, 0);

  const updateActiveFloorRooms = useCallback(
    (updater: (rooms: Room[]) => Room[]) => {
      setFloors(prev =>
        prev.map(f => (f.id === activeFloorId ? { ...f, rooms: updater(f.rooms) } : f)),
      );
    },
    [activeFloorId, setFloors],
  );

  const updateRoom = useCallback(
    (id: string, updates: Partial<Room>) => {
      updateActiveFloorRooms(prev =>
        detectSubRooms(prev.map(r => (r.id !== id ? r : mergeRoomPartialUpdate(r, updates)))),
      );
    },
    [updateActiveFloorRooms],
  );

  const {
    pendingSpecialRoom,
    pendingTargetRoomId,
    addSpecialRoom,
    cancelPendingSpecial,
    startPendingSpecialRoom,
    handleSelectTargetRoom,
    confirmPlaceOnFinalizedTarget,
  } = useSpecialRoomPlacement({
    rooms,
    roomCount: rooms.length,
    updateActiveFloorRooms,
    canvasRef,
    setSelectedRoomId,
    setPlacingElement,
    updateRoom,
  });

  const addFloor = useCallback(() => {
    const floorNum = floors.length;
    const name = floorNum === 1 ? '1e verdieping' : `${floorNum}e verdieping`;
    const newFloor = { id: crypto.randomUUID(), name, rooms: [] };
    setFloors(prev => [...prev, newFloor]);
    setActiveFloorId(newFloor.id);
    setSelectedRoomId(null);
    setPlacingElement(null);
    cancelPendingSpecial();
  }, [floors.length, setFloors, setActiveFloorId, cancelPendingSpecial]);

  const deleteFloor = useCallback(
    (floorId: string) => {
      setFloors(prev => prev.filter(f => f.id !== floorId));
      if (activeFloorId === floorId) {
        setActiveFloorId('1');
        setSelectedRoomId(null);
        setPlacingElement(null);
        cancelPendingSpecial();
      }
    },
    [activeFloorId, setFloors, setActiveFloorId, cancelPendingSpecial],
  );

  const addRoom = useCallback(
    (shape: string) => {
      setLastShape(shape);
      const spawn = canvasRef.current?.getSpawnPosition?.();
      const newRoom = buildStandardShapeRoom(shape, rooms.length, spawn);
      updateActiveFloorRooms(prev => detectSubRooms([...prev, newRoom]));
      setSelectedRoomId(newRoom.id);
      setPlacingElement(null);
      cancelPendingSpecial();
    },
    [rooms.length, updateActiveFloorRooms, cancelPendingSpecial],
  );

  const addFreeFormRoom = useCallback(
    (rawVertices: { x: number; y: number }[]) => {
      const spawn = canvasRef.current?.getSpawnPosition?.();
      const newRoom = buildFreeFormRoom(rawVertices, rooms.length, spawn);
      if (!newRoom) return;
      updateActiveFloorRooms(prev => detectSubRooms([...prev, newRoom]));
      setSelectedRoomId(newRoom.id);
      setShowFreeFormBuilder(false);
      setPlacingElement(null);
      cancelPendingSpecial();
    },
    [rooms.length, updateActiveFloorRooms, cancelPendingSpecial],
  );

  const deleteRoom = useCallback(
    (id: string) => {
      const ids = new Set<string>([id]);
      updateActiveFloorRooms(prev => detectSubRooms(prev.filter(r => !ids.has(r.id) && !ids.has(r.parentRoomId ?? ''))));
      setSelectedRoomId(null);
      setSelectedRoomIds(new Set());
      setPlacingElement(null);
      cancelPendingSpecial();
    },
    [updateActiveFloorRooms, cancelPendingSpecial],
  );

  const deleteRooms = useCallback(
    (ids: Set<string>) => {
      if (ids.size === 0) return;
      updateActiveFloorRooms(prev =>
        detectSubRooms(prev.filter(r => !ids.has(r.id) && !ids.has(r.parentRoomId ?? '')))
      );
      setSelectedRoomId(null);
      setSelectedRoomIds(new Set());
      setPlacingElement(null);
      cancelPendingSpecial();
    },
    [updateActiveFloorRooms, cancelPendingSpecial],
  );

  const moveRoom = useCallback(
    (id: string, x: number, y: number) => {
      updateActiveFloorRooms(prev => {
        const room = prev.find(r => r.id === id);
        const { finalX, finalY } = applySpecialRoomMoveConstraints(room, prev, x, y);
        return detectSubRooms(prev.map(r => (r.id === id ? { ...r, x: finalX, y: finalY } : r)));
      });
    },
    [updateActiveFloorRooms],
  );

  const moveRooms = useCallback(
    (moves: Array<{ id: string; x: number; y: number }>) => {
      updateActiveFloorRooms(prev => {
        let next = [...prev];
        for (const m of moves) {
          next = next.map(r => (r.id === m.id ? { ...r, x: m.x, y: m.y } : r));
        }
        return detectSubRooms(next);
      });
    },
    [updateActiveFloorRooms],
  );

  const placeElement = useCallback(
    (roomId: string, wall: 'top' | 'right' | 'bottom' | 'left', position: number) => {
      if (!placingElement) return;
      const el: RoomElement = {
        id: crypto.randomUUID(),
        type: placingElement.type,
        width: placingElement.width,
        height: placingElement.height,
        wall,
        position,
      };
      updateActiveFloorRooms(prev =>
        prev.map(r => (r.id === roomId ? { ...r, elements: [...r.elements, el] } : r)),
      );
      setPlacingElement(null);
    },
    [placingElement, updateActiveFloorRooms],
  );

  const cancelPlacing = useCallback(() => {
    setPlacingElement(null);
  }, []);

  const updateElement = useCallback(
    (roomId: string, elementId: string, updates: Partial<RoomElement>) => {
      updateActiveFloorRooms(prev =>
        prev.map(r =>
          r.id === roomId
            ? { ...r, elements: r.elements.map(el => (el.id === elementId ? { ...el, ...updates } : el)) }
            : r,
        ),
      );
    },
    [updateActiveFloorRooms],
  );

  const {
    clipboard,
    isCut,
    cutRoomId,
    duplicateRoom,
    copyRoom,
    cutRoom,
    pasteRoom,
  } = usePlattegrondClipboard({ selectedRoom, updateActiveFloorRooms, setSelectedRoomId });

  const toggleWallIndex = useCallback((i: number) => {
    setSelectedWallIndices(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  }, []);

  const handleFloorChange = useCallback((floorId: string) => {
    setActiveFloorId(floorId);
    setSelectedRoomId(null);
    setPlacingElement(null);
    cancelPendingSpecial();
  }, [setActiveFloorId, cancelPendingSpecial]);

  const handleSelectRoom = useCallback((id: string | null) => {
    setSelectedRoomId(id);
  }, []);

  const shouldConfirmClearRoomSelection = useCallback(() => {
    return selectedRoomId !== null && selectedWallIndices.length > 0;
  }, [selectedRoomId, selectedWallIndices]);

  const onRequestClearRoomSelectionConfirm = useCallback(() => {
    setWallEditExitConfirmOpen(true);
  }, []);

  const confirmExitWallEditToOverview = useCallback(() => {
    setWallEditExitConfirmOpen(false);
    setSelectedWallIndices([]);
    setSelectedRoomId(null);
  }, []);

  const cancelExitWallEdit = useCallback(() => {
    setWallEditExitConfirmOpen(false);
  }, []);

  usePlattegrondEffects({
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
  });

  const deleteFloorObj = deleteFloorId ? floors.find(f => f.id === deleteFloorId) : null;
  const deleteRoomObj = deleteRoomId ? rooms.find(r => r.id === deleteRoomId) : null;
  const deleteMultipleRoomsCount = deleteMultipleRoomIds ? deleteMultipleRoomIds.size : 0;

  return {
    floors,
    activeFloorId,
    rooms,
    selectedRoomId,
    setSelectedRoomId,
    selectedRoomIds,
    setSelectedRoomIds,
    totalRooms,
    canvasRef,
    sidebarRef,
    lastShape,
    placingElement,
    pendingSpecialRoom,
    pendingTargetRoomId,
    selectedWallIndices,
    clipboard,
    isCut,
    cutRoomId,
    deleteFloorId,
    setDeleteFloorId,
    deleteRoomId,
    setDeleteRoomId,
    deleteMultipleRoomIds,
    setDeleteMultipleRoomIds,
    showFreeFormBuilder,
    setShowFreeFormBuilder,
    sidebarView,
    setSidebarView,
    wallEditExitConfirmOpen,
    selectedRoom,
    addFloor,
    deleteFloor,
    addRoom,
    addFreeFormRoom,
    addSpecialRoom,
    cancelPendingSpecial,
    startPendingSpecialRoom,
    handleSelectTargetRoom,
    updateRoom,
    confirmPlaceOnFinalizedTarget,
    deleteRoom,
    deleteRooms,
    moveRoom,
    moveRooms,
    placeElement,
    cancelPlacing,
    updateElement,
    duplicateRoom,
    copyRoom,
    cutRoom,
    pasteRoom,
    toggleWallIndex,
    handleFloorChange,
    handleSelectRoom,
    shouldConfirmClearRoomSelection,
    onRequestClearRoomSelectionConfirm,
    confirmExitWallEditToOverview,
    cancelExitWallEdit,
    deleteFloorObj,
    deleteRoomObj,
    deleteMultipleRoomsCount,
    setActiveTab,
    beginBatch,
    endBatch,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
  };
}
