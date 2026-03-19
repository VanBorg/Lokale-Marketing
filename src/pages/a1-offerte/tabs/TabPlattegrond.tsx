import { useState, useCallback, useEffect, useRef } from 'react';
import { Room, RoomElement, RoomType, Floor, SHAPE_DEFAULTS, createDefaultWalls, createDefaultWallsCustomized, getShapeType, isOverlapping, isAdjacent, detectAttachedWall, computeWallOffset, shapePointsToVertices, syncRoomFromVertices, ensureVertices, verticesBoundingBox, normalizeVertices, polygonArea } from '../types';
import { PX_PER_M } from '../canvas/canvasTypes';
import { getSpecialRoomConfig } from '../specialRooms';
import RoomShapes, { SpecialRoomsSection } from '../RoomShapes';
import RoomEditPanel from '../RoomEditPanel';
import FreeFormBuilder from '../FreeFormBuilder';
import PlattegrondCanvas, { PlattegrondCanvasHandle } from '../PlattegrondCanvas';
import EtageTabBar from '../components/EtageTabBar';

let counter = 0;

function detectSubRooms(rooms: Room[]): Room[] {
  const normalRooms = rooms.filter(r => r.roomType === 'normal');
  let updated = rooms.map(r => {
    if (r.roomType === 'normal') return r;

    if (r.specialRoomPlacementMode === 'freestanding') {
      return { ...r, parentRoomId: null, isSubRoom: false, attachedWall: null, wallOffset: undefined };
    }

    const parentCandidates = normalRooms;

    for (const parent of parentCandidates) {
      if (isOverlapping(parent, r)) {
        return { ...r, parentRoomId: parent.id, isSubRoom: true, attachedWall: 'inside' as const, wallOffset: undefined };
      }
    }

    for (const parent of parentCandidates) {
      if (isAdjacent(r, parent)) {
        const wall = detectAttachedWall(r, parent);
        const wallOffset = (wall && wall !== 'inside') ? computeWallOffset(r, parent, wall) : undefined;
        return { ...r, parentRoomId: parent.id, isSubRoom: true, attachedWall: wall, wallOffset };
      }
    }

    return { ...r, parentRoomId: null, isSubRoom: false, attachedWall: null, wallOffset: undefined };
  });

  updated = updated.map(room => {
    const insideChildren = updated.filter(
      r => r.parentRoomId === room.id && r.attachedWall === 'inside',
    );
    const subtracted = insideChildren.reduce((sum, c) => sum + (c.vertices && c.vertices.length >= 3 ? polygonArea(c.vertices) : c.length * c.width), 0);
    const baseArea = room.vertices && room.vertices.length >= 3 ? polygonArea(room.vertices) : room.length * room.width;
    return { ...room, effectiveArea: baseArea - subtracted };
  });

  return updated;
}

type PlacingElement = { type: RoomElement['type']; width: number; height: number } | null;

interface TabPlattegrondProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  /** Applies room list changes without recording undo history (derived sync only). */
  patchActiveFloorRoomsSilent: (updater: (rooms: Room[]) => Room[]) => void;
  activeFloorId: string;
  setActiveFloorId: React.Dispatch<React.SetStateAction<string>>;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;
  beginBatch: () => void;
  endBatch: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export default function TabPlattegrond({
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

  const [clipboard, setClipboard] = useState<Room | null>(null);
  const [isCut, setIsCut] = useState(false);
  const [cutRoomId, setCutRoomId] = useState<string | null>(null);

  const [deleteFloorId, setDeleteFloorId] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [deleteMultipleRoomIds, setDeleteMultipleRoomIds] = useState<Set<string> | null>(null);
  const [showFreeFormBuilder, setShowFreeFormBuilder] = useState(false);
  const [sidebarView, setSidebarView] = useState<'overview' | 'edit'>('overview');

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

  const addFloor = useCallback(() => {
    const floorNum = floors.length;
    const name = floorNum === 1 ? '1e verdieping' : `${floorNum}e verdieping`;
    const newFloor: Floor = { id: crypto.randomUUID(), name, rooms: [] };
    setFloors(prev => [...prev, newFloor]);
    setActiveFloorId(newFloor.id);
    setSelectedRoomId(null);
    setPlacingElement(null);
  }, [floors.length, setFloors, setActiveFloorId]);

  const deleteFloor = useCallback(
    (floorId: string) => {
      setFloors(prev => prev.filter(f => f.id !== floorId));
      if (activeFloorId === floorId) {
        setActiveFloorId('1');
        setSelectedRoomId(null);
        setPlacingElement(null);
      }
    },
    [activeFloorId, setFloors, setActiveFloorId],
  );

  const addRoom = useCallback(
    (shape: string) => {
      setLastShape(shape);
      counter += 1;
      const dims = SHAPE_DEFAULTS[shape] ?? { length: 4, width: 3 };
      const verts = shapePointsToVertices(shape, dims.length, dims.width);
      const spawn = canvasRef.current?.getSpawnPosition?.();
      const x = spawn ? spawn.x - (dims.length * 40) / 2 : 50 + rooms.length * 30;
      const y = spawn ? spawn.y - (dims.width * 40) / 2 : 50 + rooms.length * 30;
      const newRoom: Room = {
        id: crypto.randomUUID(),
        name: `Kamer${counter}`,
        shape,
        shapeType: getShapeType(shape),
        rotation: 0,
        length: dims.length,
        width: dims.width,
        height: 2.6,
        x,
        y,
        elements: [],
        wallLengths: { top: dims.length, right: dims.width, bottom: dims.length, left: dims.width },
        vertices: verts,
        walls: createDefaultWalls(2.6),
        wallsCustomized: createDefaultWallsCustomized(),
        slopedCeiling: false,
        highestPoint: 2.6,
        ridgeCeiling: false,
        ridgeHeight: 2.6,
        isFinalized: false,
        tasks: [],
        roomType: 'normal',
        parentRoomId: null,
        isSubRoom: false,
        attachedWall: null,
        effectiveArea: dims.length * dims.width,
      };
      updateActiveFloorRooms(prev => detectSubRooms([...prev, newRoom]));
      setSelectedRoomId(newRoom.id);
      setPlacingElement(null);
    },
    [rooms.length, updateActiveFloorRooms],
  );

  const addFreeFormRoom = useCallback(
    (rawVertices: { x: number; y: number }[]) => {
      if (rawVertices.length < 3) return;
      const { vertices: normVerts } = normalizeVertices(rawVertices);
      const synced = syncRoomFromVertices(normVerts);
      const area = polygonArea(normVerts);
      const bb = verticesBoundingBox(normVerts);
      const spawn = canvasRef.current?.getSpawnPosition?.();
      const defaultX = 50 + rooms.length * 30;
      const defaultY = 50 + rooms.length * 30;
      const pixelW = bb.w * PX_PER_M;
      const pixelH = bb.h * PX_PER_M;
      const x = spawn ? spawn.x - pixelW / 2 : defaultX;
      const y = spawn ? spawn.y - pixelH / 2 : defaultY;
      counter += 1;
      const newRoom: Room = {
        id: crypto.randomUUID(),
        name: `Kamer${counter}`,
        shape: 'vrije-vorm',
        shapeType: 'rect',
        rotation: 0,
        length: synced.length,
        width: synced.width,
        height: 2.6,
        x,
        y,
        elements: [],
        wallLengths: synced.wallLengths,
        vertices: normVerts,
        walls: createDefaultWalls(2.6),
        wallsCustomized: createDefaultWallsCustomized(),
        slopedCeiling: false,
        highestPoint: 2.6,
        ridgeCeiling: false,
        ridgeHeight: 2.6,
        isFinalized: false,
        tasks: [],
        roomType: 'normal',
        parentRoomId: null,
        isSubRoom: false,
        attachedWall: null,
        effectiveArea: area,
      };
      updateActiveFloorRooms(prev => detectSubRooms([...prev, newRoom]));
      setSelectedRoomId(newRoom.id);
      setShowFreeFormBuilder(false);
      setPlacingElement(null);
    },
    [rooms.length, updateActiveFloorRooms],
  );

  const addSpecialRoom = useCallback(
    (type: RoomType, name: string, length: number, width: number) => {
      const config = getSpecialRoomConfig(type);
      const resolvedLength = config?.defaultLength ?? length;
      const resolvedWidth = config?.defaultWidth ?? width;
      const resolvedHeight = config?.defaultHeight ?? 2.4;
      const spawn = canvasRef.current?.getSpawnPosition?.();
      const defaultX = 50 + rooms.length * 30;
      const defaultY = 50 + rooms.length * 30;
      const x = spawn ? spawn.x - (resolvedLength * 40) / 2 : defaultX;
      const y = spawn ? spawn.y - (resolvedWidth * 40) / 2 : defaultY;
      const newRoom: Room = {
        id: crypto.randomUUID(),
        name,
        shape: 'rechthoek',
        shapeType: 'rect',
        rotation: 0,
        length: resolvedLength,
        width: resolvedWidth,
        height: resolvedHeight,
        x,
        y,
        elements: [],
        wallLengths: {
          top: resolvedLength,
          right: resolvedWidth,
          bottom: resolvedLength,
          left: resolvedWidth,
        },
        walls: createDefaultWalls(resolvedHeight),
        wallsCustomized: createDefaultWallsCustomized(),
        slopedCeiling: false,
        highestPoint: resolvedHeight,
        ridgeCeiling: false,
        ridgeHeight: resolvedHeight,
        isFinalized: false,
        tasks: [],
        roomType: type,
        parentRoomId: null,
        isSubRoom: false,
        attachedWall: null,
        effectiveArea: resolvedLength * resolvedWidth,
        specialRoomPlacementMode: config?.defaultPlacementMode ?? 'against-wall',
        wallRotationDeg: 0,
      };
      updateActiveFloorRooms(prev => detectSubRooms([...prev, newRoom]));
      setSelectedRoomId(newRoom.id);
      setPlacingElement(null);
    },
    [rooms.length, updateActiveFloorRooms],
  );

  const updateRoom = useCallback(
    (id: string, updates: Partial<Room>) => {
      updateActiveFloorRooms(prev =>
        detectSubRooms(prev.map(r => {
          if (r.id !== id) return r;
          const merged = { ...r, ...updates };

          if (updates.wallLengths) {
            if (updates.length === undefined) merged.length = updates.wallLengths.top;
            if (updates.width === undefined) merged.width = updates.wallLengths.right;
          } else {
            const baseVerts = (r.vertices && r.vertices.length >= 3)
              ? r.vertices
              : ensureVertices(r);

            const baseBB = verticesBoundingBox(baseVerts);
            const actualLength = Math.max(baseBB.w, 0.01);
            const actualWidth  = Math.max(baseBB.h, 0.01);

            let scaledVerts = baseVerts;
            let didScale = false;

            if (updates.length !== undefined && updates.length > 0) {
              const scaleX = updates.length / actualLength;
              scaledVerts = scaledVerts.map(v => ({ x: v.x * scaleX, y: v.y }));
              didScale = true;
            }

            if (updates.width !== undefined && updates.width > 0) {
              const scaleY = updates.width / actualWidth;
              scaledVerts = scaledVerts.map(v => ({ x: v.x, y: v.y * scaleY }));
              didScale = true;
            }

            if (didScale) {
              merged.vertices = scaledVerts;
              const synced = syncRoomFromVertices(scaledVerts);
              merged.wallLengths = synced.wallLengths;
              merged.length = updates.length ?? synced.length;
              merged.width  = updates.width  ?? synced.width;
            }
          }

          return merged;
        })),
      );
    },
    [updateActiveFloorRooms],
  );

  const deleteRoom = useCallback(
    (id: string) => {
      const ids = new Set<string>([id]);
      updateActiveFloorRooms(prev => detectSubRooms(prev.filter(r => !ids.has(r.id) && !ids.has(r.parentRoomId ?? ''))));
      setSelectedRoomId(null);
      setSelectedRoomIds(new Set());
      setPlacingElement(null);
    },
    [updateActiveFloorRooms],
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
    },
    [updateActiveFloorRooms],
  );

  const moveRoom = useCallback(
    (id: string, x: number, y: number) => {
      updateActiveFloorRooms(prev => {
        const room = prev.find(r => r.id === id);
        let finalX = x;
        let finalY = y;

        if (room?.specialRoomPlacementMode === 'inside-room') {
          const rot = room.rotation || 0;
          const rw = (rot === 90 || rot === 270 ? room.width : room.length) * PX_PER_M;
          const rh = (rot === 90 || rot === 270 ? room.length : room.width) * PX_PER_M;
          const cx = x + rw / 2;
          const cy = y + rh / 2;

          for (const parent of prev.filter(r => r.roomType === 'normal')) {
            const prot = parent.rotation || 0;
            const pw = (prot === 90 || prot === 270 ? parent.width : parent.length) * PX_PER_M;
            const ph = (prot === 90 || prot === 270 ? parent.length : parent.width) * PX_PER_M;
            const pl = parent.x;
            const pt = parent.y;
            const pr = parent.x + pw;
            const pb = parent.y + ph;

            if (cx > pl && cx < pr && cy > pt && cy < pb) {
              finalX = Math.max(pl, Math.min(pr - rw, x));
              finalY = Math.max(pt, Math.min(pb - rh, y));
              break;
            }
          }
        }

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
  }, [selectedRoom, updateActiveFloorRooms]);

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
  }, [clipboard, isCut, cutRoomId, updateActiveFloorRooms]);

  useEffect(() => {
    canvasRef.current?.goToCenter();
  }, [activeFloorId]);

  useEffect(() => {
    setSelectedWallIndices([]);
  }, [selectedRoomId]);

  useEffect(() => {
    setSidebarView(selectedRoomId ? 'edit' : 'overview');
  }, [selectedRoomId]);

  useEffect(() => {
    // Must not use setFloors here: each push clears redo; this is derived state only.
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
  }, [rooms, patchActiveFloorRoomsSilent]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [selectedRoomId, selectedRoomIds]);

  const toggleWallIndex = useCallback((i: number) => {
    setSelectedWallIndices(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  }, []);

  const handleFloorChange = useCallback((floorId: string) => {
    setActiveFloorId(floorId);
    setSelectedRoomId(null);
    setPlacingElement(null);
  }, [setActiveFloorId]);

  const handleSelectRoom = useCallback((id: string | null) => {
    setSelectedRoomId(id);
  }, []);

  const deleteFloorObj = deleteFloorId ? floors.find(f => f.id === deleteFloorId) : null;
  const deleteRoomObj = deleteRoomId ? rooms.find(r => r.id === deleteRoomId) : null;
  const deleteMultipleRoomsCount = deleteMultipleRoomIds ? deleteMultipleRoomIds.size : 0;

  return (
    <div className="flex flex-col h-full relative">
      <EtageTabBar
        floors={floors}
        activeFloorId={activeFloorId}
        onFloorChange={handleFloorChange}
        onAddFloor={addFloor}
        onDeleteFloor={(id) => setDeleteFloorId(id)}
      />

      <div className="flex flex-1 min-h-0">
        <PlattegrondCanvas
          ref={canvasRef}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={handleSelectRoom}
            selectedRoomIds={selectedRoomIds}
            onSelectedRoomIdsChange={setSelectedRoomIds}
          onMoveRoom={moveRoom}
          onUpdateRoom={updateRoom}
          onUpdateElement={updateElement}
          placingElement={placingElement}
          onPlaceElement={placeElement}
          onCancelPlacing={cancelPlacing}
          selectedRoom={selectedRoom}
          clipboard={clipboard}
          isCut={isCut}
          cutRoomId={cutRoomId}
          onDuplicate={duplicateRoom}
          onCopy={copyRoom}
          onCut={cutRoom}
          onPaste={pasteRoom}
          onMoveRooms={moveRooms}
          beginBatch={beginBatch}
          endBatch={endBatch}
          selectedWallIndices={selectedWallIndices}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
        />

        <div ref={sidebarRef} className="w-80 shrink-0 border-l border-dark-border bg-dark overflow-y-auto flex flex-col">
          <div className="flex-1">
            {showFreeFormBuilder ? (
              <FreeFormBuilder
                onConfirm={addFreeFormRoom}
                onCancel={() => setShowFreeFormBuilder(false)}
              />
            ) : (
              <>
                {sidebarView === 'overview' && (
                  <>
                    <RoomShapes
                      selectedShape={lastShape}
                      onSelect={addRoom}
                      onSelectFreeForm={() => setShowFreeFormBuilder(true)}
                      selectedRoom={selectedRoom}
                      onUpdateRoom={updateRoom}
                    />
                    <div className="border-b border-dark-border" />
                    <SpecialRoomsSection onAddSpecialRoom={addSpecialRoom} />
                  </>
                )}

                {sidebarView === 'edit' && selectedRoom && (
                  <RoomEditPanel
                    room={selectedRoom}
                    rooms={rooms}
                    onUpdate={updateRoom}
                    onDelete={deleteRoom}
                    selectedWallIndices={selectedWallIndices}
                    onToggleWallIndex={toggleWallIndex}
                    onBack={() => {
                      setSidebarView('overview');
                      setSelectedRoomId(null);
                    }}
                  />
                )}
              </>
            )}
          </div>

          {sidebarView === 'overview' && !showFreeFormBuilder && (
            <div className="p-4 border-t border-dark-border sticky bottom-0 bg-dark">
              <button
                onClick={() => setActiveTab(2)}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer"
              >
                Elementen toevoegen →
              </button>
              <p className="text-xs text-light/40 text-center mt-2">
                {totalRooms} kamer{totalRooms !== 1 ? 's' : ''} toegevoegd
              </p>
            </div>
          )}
        </div>
      </div>

      {deleteRoomObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteRoomId(null)}>
          <div className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-light/90 mb-4">
              Weet je zeker dat je <span className="font-medium text-light">{deleteRoomObj.name}</span> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteRoomId(null)} className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors cursor-pointer">
                Nee
              </button>
              <button
                onClick={() => { deleteRoom(deleteRoomId!); setDeleteRoomId(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Ja, verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMultipleRoomIds && deleteMultipleRoomsCount > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setDeleteMultipleRoomIds(null)}
        >
          <div
            className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-light/90 mb-4">
              Weet je zeker dat je{' '}
              <span className="font-medium text-light">{deleteMultipleRoomsCount}</span>{' '}
              kamers wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteMultipleRoomIds(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors cursor-pointer"
              >
                Nee
              </button>
              <button
                onClick={() => {
                  if (deleteMultipleRoomIds) {
                    deleteRooms(deleteMultipleRoomIds);
                  }
                  setDeleteMultipleRoomIds(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Ja, verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteFloorObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteFloorId(null)}>
          <div className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-light mb-2">Etage verwijderen</h3>
            <p className="text-sm text-light/70 mb-4">
              Weet je zeker dat je &apos;{deleteFloorObj.name}&apos; wilt verwijderen?
              Alle kamers op deze etage worden ook verwijderd.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteFloorId(null)} className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors cursor-pointer">
                Nee, annuleren
              </button>
              <button
                onClick={() => { deleteFloor(deleteFloorId!); setDeleteFloorId(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Ja, verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
