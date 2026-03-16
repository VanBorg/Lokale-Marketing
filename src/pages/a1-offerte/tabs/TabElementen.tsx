import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Stage as KonvaStage, Layer, Line, Rect, Arc, Circle, Text, Group } from 'react-konva';
import Konva from 'konva';
import { Trash2 } from 'lucide-react';
import { Floor, Room, RoomElement, ELEMENT_DEFAULTS, getShapePoints, getShapeType, computeQuadCorners, ROOM_TYPE_ICONS } from '../types';
import { useTheme } from '../../../hooks/useTheme';
import KamerSelector from '../components/KamerSelector';

const Stage = KonvaStage as unknown as React.ComponentType<any>;

const PX_PER_M = 40;

type WallId = 'top' | 'right' | 'bottom' | 'left';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function renderElementContent(
  type: RoomElement['type'],
  wall: WallId,
  elW: number,
) {
  const isDoor = type === 'deur' || type === 'schuifdeur';
  const isWindow = type === 'raam';
  const isHorizontal = wall === 'top' || wall === 'bottom';
  const thickness = isDoor ? 8 : isWindow ? 6 : 8;

  if (isDoor) {
    const arcRadius = Math.min(elW, 20);
    let arcX = 0, arcY = 0, arcAngle = 0;
    if (wall === 'top') { arcX = elW / 2; arcY = thickness; arcAngle = -90; }
    else if (wall === 'bottom') { arcX = elW / 2; arcY = 0; arcAngle = 90; }
    else if (wall === 'left') { arcX = thickness; arcY = elW / 2; arcAngle = 180; }
    else { arcX = 0; arcY = elW / 2; arcAngle = 0; }
    return (
      <>
        <Rect x={0} y={0} width={isHorizontal ? elW : thickness} height={isHorizontal ? thickness : elW} fill="#3B82F6" cornerRadius={1} />
        <Arc x={arcX} y={arcY} innerRadius={0} outerRadius={arcRadius} angle={90} rotation={arcAngle} fill="rgba(59,130,246,0.15)" stroke="#3B82F6" strokeWidth={0.5} />
      </>
    );
  }

  if (isWindow) {
    return (
      <>
        <Rect x={0} y={0} width={isHorizontal ? elW : thickness} height={isHorizontal ? thickness : elW} fill="#FFFFFF" cornerRadius={1} />
        {[1, 2, 3].map((i) => {
          const lx = (elW / 4) * i;
          const ly = (elW / 4) * i;
          return isHorizontal
            ? <Line key={i} points={[lx, 0, lx, thickness]} stroke="#999" strokeWidth={0.5} />
            : <Line key={i} points={[0, ly, thickness, ly]} stroke="#999" strokeWidth={0.5} />;
        })}
      </>
    );
  }

  const elementColors: Record<string, string> = {
    openhaard: '#EF4444', radiator: '#A855F7', kolom: '#6B7280', badkuip: '#06B6D4', toilet: '#10B981',
  };
  const fill = elementColors[type] ?? '#9CA3AF';
  return <Rect x={0} y={0} width={isHorizontal ? elW : thickness} height={isHorizontal ? thickness : elW} fill={fill} cornerRadius={2} />;
}

function miniBounds(room: Room): { w: number; h: number } {
  const st = room.shapeType ?? getShapeType(room.shape);
  if (st === 'circle') { const d = room.length * PX_PER_M; return { w: d, h: d }; }
  if (st === 'halfcircle') { const r = (room.length * PX_PER_M) / 2; return { w: r * 2, h: r }; }
  const wl = room.wallLengths;
  if (st === 'rect' && wl && (wl.top !== wl.bottom || wl.left !== wl.right)) {
    const pts = computeQuadCorners(wl);
    let mx = 0, my = 0;
    for (let i = 0; i < pts.length; i += 2) { mx = Math.max(mx, pts[i]); my = Math.max(my, pts[i + 1]); }
    return { w: mx, h: my };
  }
  return { w: room.length * PX_PER_M, h: room.width * PX_PER_M };
}

function miniPoints(room: Room, w: number, h: number): number[] {
  const wl = room.wallLengths;
  const st = room.shapeType ?? getShapeType(room.shape);
  if (st === 'rect' && wl && (wl.top !== wl.bottom || wl.left !== wl.right)) {
    return computeQuadCorners(wl);
  }
  return getShapePoints(room.shape, w, h);
}

const elementTypes = Object.keys(ELEMENT_DEFAULTS) as RoomElement['type'][];

const WALL_LABELS: Record<WallId, string> = { top: 'Boven', right: 'Rechts', bottom: 'Onder', left: 'Links' };

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

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
    if (selectedRoomId && !rooms.find(r => r.id === selectedRoomId) && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
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
        prev.map(f => ({
          ...f,
          rooms: f.rooms.map(r =>
            r.id === roomId ? { ...r, elements: updater(r.elements) } : r,
          ),
        })),
      );
    },
    [setFloors],
  );

  const addElement = useCallback(
    (type: RoomElement['type']) => {
      if (!selectedRoomId) return;
      const defaults = ELEMENT_DEFAULTS[type];
      const el: RoomElement = {
        id: crypto.randomUUID(),
        type,
        width: defaults.width,
        height: defaults.height,
        wall: 'top',
        position: 0.5,
      };
      updateRoomElements(selectedRoomId, prev => [...prev, el]);
    },
    [selectedRoomId, updateRoomElements],
  );

  const updateElement = useCallback(
    (roomId: string, elementId: string, updates: Partial<RoomElement>) => {
      updateRoomElements(roomId, prev =>
        prev.map(el => (el.id === elementId ? { ...el, ...updates } : el)),
      );
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

  const [miniOpen, setMiniOpen] = useState(true);
  const miniContainerRef = useRef<HTMLDivElement>(null);
  const [miniWidth, setMiniWidth] = useState(400);

  useEffect(() => {
    if (!miniContainerRef.current) return;
    const measure = () => {
      const rect = miniContainerRef.current!.getBoundingClientRect();
      setMiniWidth(rect.width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(miniContainerRef.current);
    return () => observer.disconnect();
  }, [miniOpen]);

  const childRoomsOfSelected = useMemo(
    () => selectedRoom ? rooms.filter(r => r.parentRoomId === selectedRoom.id) : [],
    [rooms, selectedRoom],
  );

  const miniData = useMemo(() => {
    if (rooms.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rooms) {
      const { w, h } = miniBounds(r);
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + w);
      maxY = Math.max(maxY, r.y + h);
    }
    const totalW = maxX - minX || 1;
    const totalH = maxY - minY || 1;
    const miniH = 180;
    const pad = 20;
    const sX = (miniWidth - pad * 2) / totalW;
    const sY = (miniH - pad * 2) / totalH;
    const s = Math.min(sX, sY, 3);
    const oX = (miniWidth - totalW * s) / 2 - minX * s;
    const oY = (miniH - totalH * s) / 2 - minY * s;
    return { s, oX, oY, miniH };
  }, [rooms, miniWidth]);

  const roomW = selectedRoom ? selectedRoom.length * PX_PER_M : 0;
  const shapeType = selectedRoom ? (selectedRoom.shapeType ?? getShapeType(selectedRoom.shape)) : 'rect';
  const roomH = selectedRoom
    ? (shapeType === 'circle' ? roomW : selectedRoom.width * PX_PER_M)
    : 0;

  const padding = 60;
  const scaleX = roomW > 0 ? (canvasSize.width - padding * 2) / roomW : 1;
  const scaleY = roomH > 0 ? (canvasSize.height - padding * 2) / roomH : 1;
  const canvasScale = Math.min(scaleX, scaleY, 3) * 0.8;
  const offsetX = (canvasSize.width - roomW * canvasScale) / 2;
  const offsetY = (canvasSize.height - roomH * canvasScale) / 2;

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
              <div className="mx-4 mt-3 mb-1 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                Deze kamer bevat: {childRoomsOfSelected.map(c => c.name).join(', ')}
              </div>
            )}
            <div className="p-4 border-b border-dark-border">
              <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-3">
                Element toevoegen
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {elementTypes.map((type) => {
                  const def = ELEMENT_DEFAULTS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => addElement(type)}
                      className="px-2 py-2 rounded-lg text-xs font-medium bg-dark-card border border-dark-border text-light/70 hover:border-accent/40 hover:text-light transition-colors cursor-pointer text-center"
                    >
                      <span className="block">{def.label}</span>
                      <span className="block text-[10px] text-light/30 mt-0.5">
                        {def.width}×{def.height}m
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mini plattegrond overview */}
            <div className="border-b border-dark-border">
              <button
                type="button"
                onClick={() => setMiniOpen(p => !p)}
                className="w-full px-4 py-2 text-[11px] font-medium text-light/50 hover:text-light/80 transition-colors cursor-pointer text-left"
              >
                {miniOpen ? '▲ Plattegrond verbergen' : '▼ Plattegrond tonen'}
              </button>
              {miniOpen && miniData && (
                <div ref={miniContainerRef} style={{ height: miniData.miniH, background: canvasColors.stageBg }}>
                  <Stage width={miniWidth} height={miniData.miniH} listening={false}>
                    <Layer>
                      <Group x={miniData.oX} y={miniData.oY} scaleX={miniData.s} scaleY={miniData.s}>
                        {rooms.map(r => {
                          const st = r.shapeType ?? getShapeType(r.shape);
                          const { w: rw, h: rh } = miniBounds(r);
                          const isSel = r.id === selectedRoomId;
                          const pts = miniPoints(r, rw, rh);
                          const fill = r.isSubRoom ? '#0D1F2D' : canvasColors.roomFill;
                          const strokeColor = isSel ? canvasColors.roomStrokeSelected : (r.isSubRoom ? '#1A6BFF' : canvasColors.roomStroke);
                          return (
                            <Group key={r.id} x={r.x} y={r.y}>
                              {st === 'circle' ? (
                                <Circle x={rw / 2} y={rh / 2} radius={rw / 2} fill={fill} stroke={strokeColor} strokeWidth={isSel ? 2 / miniData.s : 1 / miniData.s} />
                              ) : st === 'halfcircle' ? (
                                <Arc x={rw / 2} y={rh / 2} innerRadius={0} outerRadius={rw / 2} angle={180} rotation={-90} fill={fill} stroke={strokeColor} strokeWidth={isSel ? 2 / miniData.s : 1 / miniData.s} />
                              ) : (
                                <Line points={pts} closed fill={fill} stroke={strokeColor} strokeWidth={isSel ? 2 / miniData.s : 1 / miniData.s} />
                              )}
                              <Text
                                text={r.name}
                                x={4}
                                y={4}
                                fontSize={10 / miniData.s}
                                fill={isSel ? canvasColors.textSelected : canvasColors.text}
                                opacity={isSel ? 1 : 0.5}
                                fontFamily="DM Sans, sans-serif"
                              />
                              {r.roomType !== 'normal' && (
                                <Text text={ROOM_TYPE_ICONS[r.roomType] || ''} x={rw - 16 / miniData.s} y={4} fontSize={12 / miniData.s} />
                              )}
                            </Group>
                          );
                        })}
                      </Group>
                    </Layer>
                  </Stage>
                </div>
              )}
              {miniOpen && !miniData && (
                <div ref={miniContainerRef} className="px-4 py-6 text-center text-xs text-light/30">
                  Geen kamers om te tonen
                </div>
              )}
            </div>

            <div ref={canvasContainerRef} className="flex-1 min-h-[300px]" style={{ background: canvasColors.stageBg }}>
              <Stage width={canvasSize.width} height={canvasSize.height}>
                <Layer>
                  <Group x={offsetX} y={offsetY} scaleX={canvasScale} scaleY={canvasScale}>
                    {shapeType === 'rect' && (
                      <Line
                        points={getShapePoints(selectedRoom.shape, roomW, roomH)}
                        closed
                        fill={canvasColors.roomFill}
                        stroke={canvasColors.roomStrokeSelected}
                        strokeWidth={2 / canvasScale}
                      />
                    )}
                    {shapeType === 'circle' && (
                      <Circle x={roomW / 2} y={roomH / 2} radius={roomW / 2} fill={canvasColors.roomFill} stroke={canvasColors.roomStrokeSelected} strokeWidth={2 / canvasScale} />
                    )}
                    {shapeType === 'halfcircle' && (
                      <Arc x={roomW / 2} y={roomH / 2} innerRadius={0} outerRadius={roomW / 2} angle={180} rotation={-90} fill={canvasColors.roomFill} stroke={canvasColors.roomStrokeSelected} strokeWidth={2 / canvasScale} />
                    )}

                    {shapeType === 'rect' && (
                      <>
                        <Text text="1" x={roomW / 2 - 4} y={4} fontSize={12 / canvasScale} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
                        <Text text="2" x={roomW - 16 / canvasScale} y={roomH / 2 - 6} fontSize={12 / canvasScale} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
                        <Text text="3" x={roomW / 2 - 4} y={roomH - 16 / canvasScale} fontSize={12 / canvasScale} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
                        <Text text="4" x={4} y={roomH / 2 - 6} fontSize={12 / canvasScale} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
                      </>
                    )}

                    {selectedRoom.elements.map((el) => {
                      const elW = el.width * PX_PER_M;
                      const isDoor = el.type === 'deur' || el.type === 'schuifdeur';
                      const isWindow = el.type === 'raam';
                      const thickness = isDoor ? 8 : isWindow ? 6 : 8;
                      const pos = clamp(el.position, 0.05, 0.95);
                      let ex = 0, ey = 0;

                      switch (el.wall) {
                        case 'top': ex = roomW * pos - elW / 2; ey = 0; break;
                        case 'right': ex = roomW - thickness; ey = roomH * pos - elW / 2; break;
                        case 'bottom': ex = roomW * pos - elW / 2; ey = roomH - thickness; break;
                        case 'left': ex = 0; ey = roomH * pos - elW / 2; break;
                      }

                      const elH = el.height * PX_PER_M;
                      const isHoriz = el.wall === 'top' || el.wall === 'bottom';
                      const bw = isHoriz ? elW : thickness;
                      const bh = isHoriz ? thickness : elW;
                      const isElSelected = el.id === selectedElementId;

                      const dragBoundFunc = (dragPos: { x: number; y: number }) => {
                        const localX = (dragPos.x - offsetX) / canvasScale;
                        const localY = (dragPos.y - offsetY) / canvasScale;
                        if (el.wall === 'top' || el.wall === 'bottom') {
                          const fixedY = el.wall === 'top' ? 0 : roomH - thickness;
                          const clampedX = Math.max(0, Math.min(roomW - elW, localX));
                          return { x: clampedX * canvasScale + offsetX, y: fixedY * canvasScale + offsetY };
                        } else {
                          const fixedX = el.wall === 'left' ? 0 : roomW - thickness;
                          const clampedY = Math.max(0, Math.min(roomH - elH, localY));
                          return { x: fixedX * canvasScale + offsetX, y: clampedY * canvasScale + offsetY };
                        }
                      };

                      const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
                        const node = e.target;
                        const localX = (node.x() - offsetX) / canvasScale;
                        const localY = (node.y() - offsetY) / canvasScale;
                        let newPos: number;
                        if (el.wall === 'top' || el.wall === 'bottom') {
                          newPos = (localX + elW / 2) / roomW;
                        } else {
                          newPos = (localY + elH / 2) / roomH;
                        }
                        newPos = clamp(newPos, 0.05, 0.95);
                        updateElement(selectedRoom.id, el.id, { position: newPos });
                        node.x(ex * canvasScale + offsetX);
                        node.y(ey * canvasScale + offsetY);
                      };

                      return (
                        <Group
                          key={el.id}
                          x={ex}
                          y={ey}
                          draggable
                          dragBoundFunc={dragBoundFunc}
                          onDragEnd={handleDragEnd}
                          onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                            e.cancelBubble = true;
                            setSelectedElementId(el.id);
                          }}
                        >
                          {renderElementContent(el.type, el.wall, elW)}
                          <Rect x={0} y={0} width={bw} height={bh} fill="transparent" stroke={isElSelected ? '#FF5C1A' : 'rgba(255,255,255,0.4)'} strokeWidth={isElSelected ? 2 : 1} />
                          {isElSelected && (
                            <>
                              <Rect x={-3} y={-3} width={6} height={6} fill="#FF5C1A" />
                              <Rect x={bw - 3} y={-3} width={6} height={6} fill="#FF5C1A" />
                              <Rect x={-3} y={bh - 3} width={6} height={6} fill="#FF5C1A" />
                              <Rect x={bw - 3} y={bh - 3} width={6} height={6} fill="#FF5C1A" />
                            </>
                          )}
                        </Group>
                      );
                    })}
                  </Group>
                </Layer>
              </Stage>
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
                      <tr
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`cursor-pointer transition-colors ${el.id === selectedElementId ? 'bg-accent/5' : 'hover:bg-dark-hover'}`}
                      >
                        <td className="px-4 py-2 text-light/70">{ELEMENT_DEFAULTS[el.type].label}</td>
                        <td className="px-4 py-2">
                          <select
                            value={el.wall}
                            onChange={(e) => updateElement(selectedRoom.id, el.id, { wall: e.target.value as WallId })}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-dark border border-dark-border rounded px-1.5 py-0.5 text-light text-xs focus:outline-none focus:border-accent"
                          >
                            {(Object.keys(WALL_LABELS) as WallId[]).map(w => (
                              <option key={w} value={w}>{WALL_LABELS[w]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-light/50">{el.width}m</td>
                        <td className="px-4 py-2 text-light/50">{el.height}m</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); removeElement(selectedRoom.id, el.id); }}
                            className="p-1 rounded text-light/30 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                          >
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
          <button
            onClick={() => setActiveTab(1)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-card border border-dark-border text-light/60 hover:text-light transition-colors cursor-pointer"
          >
            ← Plattegrond
          </button>
          <button
            onClick={() => setActiveTab(3)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer"
          >
            Werkzaamheden →
          </button>
        </div>
      </div>
    </div>
  );
}
