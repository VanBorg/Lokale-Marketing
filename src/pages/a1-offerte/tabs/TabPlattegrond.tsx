import { useState, useCallback, useEffect } from 'react';
import { Room, RoomElement, RoomType, Floor, SHAPE_DEFAULTS, createDefaultWalls, createDefaultWallsCustomized, getShapeType } from '../types';
import RoomShapes from '../RoomShapes';
import RoomProperties from '../RoomProperties';
import PlattegrondCanvas from '../PlattegrondCanvas';
import EtageTabBar from '../components/EtageTabBar';

let counter = 0;

type PlacingElement = { type: RoomElement['type']; width: number; height: number } | null;

interface TabPlattegrondProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  activeFloorId: string;
  setActiveFloorId: React.Dispatch<React.SetStateAction<string>>;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;
}

export default function TabPlattegrond({
  floors,
  setFloors,
  activeFloorId,
  setActiveFloorId,
  setActiveTab,
}: TabPlattegrondProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [lastShape, setLastShape] = useState<string | null>(null);
  const [placingElement, setPlacingElement] = useState<PlacingElement>(null);

  const [clipboard, setClipboard] = useState<Room | null>(null);
  const [isCut, setIsCut] = useState(false);
  const [cutRoomId, setCutRoomId] = useState<string | null>(null);

  const [deleteFloorId, setDeleteFloorId] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  const activeFloor = floors.find(f => f.id === activeFloorId)!;
  const rooms = activeFloor.rooms;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;
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
      const newRoom: Room = {
        id: crypto.randomUUID(),
        name: `Kamer ${counter}`,
        shape,
        shapeType: getShapeType(shape),
        rotation: 0,
        length: dims.length,
        width: dims.width,
        height: 2.6,
        x: 50 + rooms.length * 30,
        y: 50 + rooms.length * 30,
        elements: [],
        walls: createDefaultWalls(2.6),
        wallsCustomized: createDefaultWallsCustomized(),
        slopedCeiling: false,
        highestPoint: 2.6,
        isFinalized: false,
        tasks: [],
        roomType: 'normal',
      };
      updateActiveFloorRooms(prev => [...prev, newRoom]);
      setSelectedRoomId(newRoom.id);
      setPlacingElement(null);
    },
    [rooms.length, updateActiveFloorRooms],
  );

  const addSpecialRoom = useCallback(
    (type: RoomType, name: string, length: number, width: number) => {
      const newRoom: Room = {
        id: crypto.randomUUID(),
        name,
        shape: 'rechthoek',
        shapeType: 'rect',
        rotation: 0,
        length,
        width,
        height: 2.6,
        x: 50 + rooms.length * 30,
        y: 50 + rooms.length * 30,
        elements: [],
        walls: createDefaultWalls(2.6),
        wallsCustomized: createDefaultWallsCustomized(),
        slopedCeiling: false,
        highestPoint: 2.6,
        isFinalized: false,
        tasks: [],
        roomType: type,
      };
      updateActiveFloorRooms(prev => [...prev, newRoom]);
      setSelectedRoomId(newRoom.id);
      setPlacingElement(null);
    },
    [rooms.length, updateActiveFloorRooms],
  );

  const updateRoom = useCallback(
    (id: string, updates: Partial<Room>) => {
      updateActiveFloorRooms(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
    },
    [updateActiveFloorRooms],
  );

  const deleteRoom = useCallback(
    (id: string) => {
      updateActiveFloorRooms(prev => prev.filter(r => r.id !== id));
      setSelectedRoomId(null);
      setPlacingElement(null);
    },
    [updateActiveFloorRooms],
  );

  const moveRoom = useCallback(
    (id: string, x: number, y: number) => {
      updateActiveFloorRooms(prev => prev.map(r => (r.id === id ? { ...r, x, y } : r)));
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
    updateActiveFloorRooms(prev => [...prev, copy]);
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
      return next;
    });
    setSelectedRoomId(pasted.id);
    if (isCut) {
      setIsCut(false);
      setCutRoomId(null);
    }
    setClipboard(prev => prev ? { ...prev, x: prev.x + 20, y: prev.y + 20 } : null);
  }, [clipboard, isCut, cutRoomId, updateActiveFloorRooms]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedRoomId) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setDeleteRoomId(selectedRoomId);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRoomId]);

  const handleFloorChange = useCallback((floorId: string) => {
    setActiveFloorId(floorId);
    setSelectedRoomId(null);
    setPlacingElement(null);
  }, [setActiveFloorId]);

  const deleteFloorObj = deleteFloorId ? floors.find(f => f.id === deleteFloorId) : null;
  const deleteRoomObj = deleteRoomId ? rooms.find(r => r.id === deleteRoomId) : null;

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
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
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
        />

        <div className="w-80 shrink-0 border-l border-dark-border bg-dark overflow-y-auto flex flex-col">
          <div className="flex-1">
            <RoomShapes
              selectedShape={lastShape}
              onSelect={addRoom}
              onAddSpecialRoom={addSpecialRoom}
              selectedRoom={selectedRoom}
              onUpdateRoom={updateRoom}
            />

            {selectedRoom && (
              <RoomProperties room={selectedRoom} onUpdate={updateRoom} onDelete={deleteRoom} />
            )}
          </div>

          <div className="p-4 border-t border-dark-border">
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
