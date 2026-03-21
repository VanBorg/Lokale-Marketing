import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Floor, RoomElement, ELEMENT_DEFAULTS } from '../types';
import { WallId } from '../canvas/canvasTypes';
import { useTheme } from '../../../hooks/useTheme';
import KamerSelector from '../components/KamerSelector';
import MiniPlattegrond from '../components/MiniPlattegrond';
import ElementCanvas, { WALL_LABELS } from '../components/ElementCanvas';

interface TabElementenProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  activeFloorId: string;
  setActiveFloorId: React.Dispatch<React.SetStateAction<string>>;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;
}

export default function TabElementen({
  floors,
  setFloors,
  activeFloorId,
  setActiveFloorId,
  setActiveTab,
}: TabElementenProps) {
  const { canvasColors } = useTheme();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

  const activeFloor = floors.find(f => f.id === activeFloorId);
  const rooms = useMemo(() => activeFloor?.rooms ?? [], [activeFloor]);
  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null;

  const elementTypes = Object.keys(ELEMENT_DEFAULTS) as RoomElement['type'][];

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) setSelectedRoomId(rooms[0].id);
    if (selectedRoomId && !rooms.find(r => r.id === selectedRoomId) && rooms.length > 0) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const measure = () => {
      const rect = canvasContainerRef.current!.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const updateRoomElements = useCallback(
    (roomId: string, updater: (elements: RoomElement[]) => RoomElement[]) => {
      setFloors(prev =>
        prev.map(f => ({ ...f, rooms: f.rooms.map(r => r.id === roomId ? { ...r, elements: updater(r.elements) } : r) })),
      );
    },
    [setFloors],
  );

  const addElement = useCallback(
    (type: RoomElement['type']) => {
      if (!selectedRoomId) return;
      const defaults = ELEMENT_DEFAULTS[type];
      const el: RoomElement = { id: crypto.randomUUID(), type, width: defaults.width, height: defaults.height, wall: 'top', position: 0.5 };
      updateRoomElements(selectedRoomId, prev => [...prev, el]);
    },
    [selectedRoomId, updateRoomElements],
  );

  const updateElement = useCallback(
    (roomId: string, elementId: string, updates: Partial<RoomElement>) => {
      updateRoomElements(roomId, prev => prev.map(el => (el.id === elementId ? { ...el, ...updates } : el)));
    },
    [updateRoomElements],
  );

  const removeElement = useCallback(
    (roomId: string, elementId: string) => {
      updateRoomElements(roomId, prev => prev.filter(el => el.id !== elementId));
      if (selectedElementId === elementId) setSelectedElementId(null);
    },
    [updateRoomElements, selectedElementId],
  );

  const childRoomsOfSelected = useMemo(
    () => selectedRoom ? rooms.filter(r => r.parentRoomId === selectedRoom.id) : [],
    [rooms, selectedRoom],
  );

  return (
    <div className="flex h-full">
      <div className="w-[300px] shrink-0 border-r border-dark-border">
        <KamerSelector
          floors={floors}
          activeFloorId={activeFloorId}
          onFloorChange={(id) => { setActiveFloorId(id); setSelectedRoomId(null); }}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          emptyAction={() => setActiveTab(1)}
          emptyLabel="← Naar Plattegrond"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {!selectedRoom ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-light/40">Selecteer een kamer om elementen toe te voegen</p>
          </div>
        ) : (
          <>
            {childRoomsOfSelected.length > 0 && (
              <div className="mx-4 mt-3 mb-1 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent">
                Deze kamer bevat: {childRoomsOfSelected.map(c => c.name).join(', ')}
              </div>
            )}
            <div className="p-4 border-b border-dark-border">
              <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-3">Element toevoegen</h3>
              <div className="grid grid-cols-4 gap-2">
                {elementTypes.map((type) => {
                  const def = ELEMENT_DEFAULTS[type];
                  return (
                    <button key={type} onClick={() => addElement(type)} className="px-2 py-2 rounded-lg text-xs font-medium bg-dark-card border border-dark-border text-light/70 hover:border-accent/40 hover:text-light transition-colors cursor-pointer text-center">
                      <span className="block">{def.label}</span>
                      <span className="block text-[10px] text-light/30 mt-0.5">{def.width}×{def.height}m</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <MiniPlattegrond rooms={rooms} selectedRoomId={selectedRoomId} canvasColors={canvasColors} />

            <div ref={canvasContainerRef} className="flex-1 min-h-[300px]" style={{ background: canvasColors.stageBg }}>
              <ElementCanvas
                room={selectedRoom}
                canvasSize={canvasSize}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElement={updateElement}
                canvasColors={canvasColors}
              />
            </div>

            {selectedRoom.elements.length > 0 && (
              <div className="border-t border-dark-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-light/40 border-b border-dark-border">
                      <th className="text-left px-4 py-2 font-medium">Naam</th>
                      <th className="text-left px-4 py-2 font-medium">Muur</th>
                      <th className="text-left px-4 py-2 font-medium">Breedte</th>
                      <th className="text-left px-4 py-2 font-medium">Hoogte</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRoom.elements.map((el) => (
                      <tr key={el.id} onClick={() => setSelectedElementId(el.id)} className={`cursor-pointer transition-colors ${el.id === selectedElementId ? 'bg-accent/5' : 'hover:bg-dark-hover'}`}>
                        <td className="px-4 py-2 text-light/70">{ELEMENT_DEFAULTS[el.type].label}</td>
                        <td className="px-4 py-2">
                          <select value={el.wall} onChange={(e) => updateElement(selectedRoom.id, el.id, { wall: e.target.value as WallId })} onClick={(e) => e.stopPropagation()} className="bg-dark border border-dark-border rounded px-1.5 py-0.5 text-light text-xs focus:outline-none focus:border-accent">
                            {(Object.keys(WALL_LABELS) as WallId[]).map(w => (
                              <option key={w} value={w}>{WALL_LABELS[w]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-light/50">{el.width}m</td>
                        <td className="px-4 py-2 text-light/50">{el.height}m</td>
                        <td className="px-4 py-2">
                          <button onClick={(e) => { e.stopPropagation(); removeElement(selectedRoom.id, el.id); }} className="p-1 rounded text-light/30 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="shrink-0 flex items-center justify-between p-4 border-t border-dark-border bg-dark">
          <button onClick={() => setActiveTab(1)} className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-card border border-dark-border text-light/60 hover:text-light transition-colors cursor-pointer">
            ← Plattegrond
          </button>
          <button onClick={() => setActiveTab(3)} className="px-4 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer">
            Werkzaamheden →
          </button>
        </div>
      </div>
    </div>
  );
}
