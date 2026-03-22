import { useState, useEffect, useRef, useMemo } from 'react';
import { Lock, Unlock } from 'lucide-react';
import {
  Room,
  RoomWalls as RoomWallsType,
  WallSide,
  calcWallArea,
  ensureVertices,
  vertexWallLengths,
  updateVertexWallLength,
  syncRoomFromVertices,
  getRoomCornerIds,
} from '../types';
import { PX_PER_M } from '../canvas/canvasTypes';
import { snapToRooms } from '../canvas/canvasSnapping';

interface RoomWallsProps {
  room: Room;
  rooms: Room[];
  onUpdate: (id: string, updates: Partial<Room>) => void;
  selectedWallIndices: number[];
  onToggleWallIndex: (i: number) => void;
  section?: 'lengths' | 'heights' | 'both';
}

const WALL_LABELS_4 = ['Boven', 'Rechts', 'Onder', 'Links'];
const WALL_HEIGHT_KEYS: (keyof RoomWallsType)[] = ['top', 'right', 'bottom', 'left'];

export default function RoomWalls({
  room,
  rooms,
  onUpdate,
  selectedWallIndices,
  onToggleWallIndex,
  section = 'both',
}: RoomWallsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [wallStrings, setWallStrings] = useState<Record<string, string>>({});
  const [lengthStrings, setLengthStrings] = useState<Record<string, string>>({});
  const focusedLengthRef = useRef<string | null>(null);
  const [snapFocusedKey, setSnapFocusedKey] = useState<string | null>(null);

  const verts = ensureVertices(room);
  const wallLens = vertexWallLengths(verts);
  const wallCount = verts.length;
  const locks = room.wallLocks ?? new Array(wallCount).fill(false);
  const cornerIds = getRoomCornerIds(room);
  const isSpecial = room.roomType !== 'normal';

  // Collect wall lengths from all other rooms for magnetic snap suggestions
  const snapSuggestions = useMemo(() => {
    if (!snapFocusedKey) return [];
    const currentVal = parseFloat(lengthStrings[snapFocusedKey] ?? '0') || 0;
    const seen = new Set<number>();
    rooms.forEach(r => {
      if (r.id === room.id) return;
      vertexWallLengths(ensureVertices(r)).forEach(l => {
        const v = Math.round(l * 100) / 100;
        if (v >= 0.1) seen.add(v);
      });
    });
    return Array.from(seen)
      .sort((a, b) => Math.abs(a - currentVal) - Math.abs(b - currentVal))
      .slice(0, 5);
  }, [snapFocusedKey, lengthStrings, rooms, room.id]);

  useEffect(() => {
    setWallStrings({});
    setIsExpanded(false);
    const curVerts = ensureVertices(room);
    const curLens = vertexWallLengths(curVerts);
    const strs: Record<string, string> = {};
    curLens.forEach((len, i) => { strs[String(i)] = len.toFixed(2); });
    setLengthStrings(strs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    const newLens = vertexWallLengths(ensureVertices(room));
    setLengthStrings(prev => {
      const next = { ...prev };
      newLens.forEach((len, i) => {
        const key = String(i);
        if (focusedLengthRef.current !== key) next[key] = len.toFixed(2);
      });
      return next;
    });
  }, [room]);

  const applyWallLength = (wallIndex: number, newLength: number) => {
    const curVerts = ensureVertices(room);
    const result = updateVertexWallLength(curVerts, wallIndex, newLength, locks);
    const synced = syncRoomFromVertices(result.vertices);
    const updates: Partial<Room> = {
      vertices: result.vertices,
      length: synced.length,
      width: synced.width,
      wallLengths: synced.wallLengths,
    };
    if (result.offsetX !== 0 || result.offsetY !== 0) {
      updates.x = room.x + result.offsetX * PX_PER_M;
      updates.y = room.y + result.offsetY * PX_PER_M;
    }
    const newX = updates.x ?? room.x;
    const newY = updates.y ?? room.y;
    const updatedRoom = { ...room, ...updates };
    const updatedRooms = rooms.map(r => r.id === room.id ? updatedRoom : r);
    const snapped = snapToRooms(room.id, newX, newY, updatedRooms);
    if (snapped.x !== newX || snapped.y !== newY) {
      updates.x = snapped.x;
      updates.y = snapped.y;
    }
    onUpdate(room.id, updates);
  };

  const toggleLock = (wallIndex: number) => {
    const newLocks = [...locks];
    while (newLocks.length < wallCount) newLocks.push(false);
    newLocks[wallIndex] = !newLocks[wallIndex];
    onUpdate(room.id, { wallLocks: newLocks });
  };

  // Wall heights logic
  const updateWall = (side: keyof RoomWallsType, field: keyof WallSide, value: number) => {
    if (isNaN(value)) return;
    const wc = room.wallsCustomized ?? { top: false, right: false, bottom: false, left: false };
    onUpdate(room.id, {
      walls: { ...room.walls, [side]: { ...room.walls[side], [field]: value } },
      wallsCustomized: { ...wc, [side]: true },
    });
  };

  const updateAllWalls = (h: number) => {
    if (isNaN(h) || h <= 0) return;
    const nextWalls: Room['walls'] = {
      top: { ...room.walls.top, heightLeft: h, heightRight: h },
      right: { ...room.walls.right, heightLeft: h, heightRight: h },
      bottom: { ...room.walls.bottom, heightLeft: h, heightRight: h },
      left: { ...room.walls.left, heightLeft: h, heightRight: h },
    };
    onUpdate(room.id, { height: h, walls: nextWalls });
  };

  const resetAllWalls = () => {
    const base = room.height || 2.6;
    const side = { heightLeft: base, heightRight: base };
    onUpdate(room.id, {
      height: base,
      walls: { top: { ...side }, right: { ...side }, bottom: { ...side }, left: { ...side } },
      wallsCustomized: { top: false, right: false, bottom: false, left: false },
    });
    setWallStrings({});
  };

  const handleWallChange = (side: keyof RoomWallsType, field: keyof WallSide, raw: string) => {
    const key = `${side}_${field}`;
    setWallStrings(prev => ({ ...prev, [key]: raw }));
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      setIsExpanded(true);
      updateWall(side, field, n);
    }
  };

  const handleWallBlur = (side: keyof RoomWallsType, field: keyof WallSide) => {
    const key = `${side}_${field}`;
    const raw = wallStrings[key];
    if (raw === undefined) return;
    const n = parseFloat(raw);
    if (isNaN(n)) {
      setWallStrings(prev => ({ ...prev, [key]: String(room.walls[side][field]) }));
    }
  };

  const getDisplayValue = (side: keyof RoomWallsType, field: keyof WallSide) => {
    const key = `${side}_${field}`;
    return wallStrings[key] ?? String(room.walls[side][field]);
  };

  const allWallsEqual =
    room.walls.top.heightLeft === room.walls.top.heightRight &&
    room.walls.right.heightLeft === room.walls.right.heightRight &&
    room.walls.bottom.heightLeft === room.walls.bottom.heightRight &&
    room.walls.left.heightLeft === room.walls.left.heightRight &&
    room.walls.top.heightLeft === room.walls.right.heightLeft &&
    room.walls.top.heightLeft === room.walls.bottom.heightLeft &&
    room.walls.top.heightLeft === room.walls.left.heightLeft;

  const canUseGlobalHeight = allWallsEqual && !isExpanded;
  const baseHeaderCls = 'text-xs font-semibold text-light/50 uppercase tracking-wider';
  const showLengths = section === 'both' || section === 'lengths';
  const showHeights = section === 'both' || section === 'heights';

  return (
    <div className="p-4 border-b border-dark-border">
      {showLengths && (
        <>
          <h3 className={`${baseHeaderCls} mb-2`}>Muurlengtes</h3>

          {/* Compact chip grid – 3 columns */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {Array.from({ length: wallCount }, (_, i) => {
              const len = wallLens[i];
              const isLocked = locks[i] ?? false;
              const isSel = selectedWallIndices.includes(i);
              // Adjacent wall labels: wall at start is wall (i-1+n)%n, wall at end is wall (i+1)%n
              const startAdj = (i - 1 + wallCount) % wallCount;
              const endAdj = (i + 1) % wallCount;
              // Short corner ID for special rooms: last 6 chars of the corner hash
              const startCornerId = cornerIds[i];
              const endCornerId = cornerIds[endAdj];
              const startCornerShort = startCornerId ? startCornerId.split('+').map(s => s.split('-w').pop()).join('·') : '';
              const endCornerShort = endCornerId ? endCornerId.split('+').map(s => s.split('-w').pop()).join('·') : '';
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !room.isFinalized && onToggleWallIndex(i)}
                  disabled={room.isFinalized}
                  title={`Muur ${i + 1} — ${len.toFixed(2)} m${isLocked ? ' (vergrendeld)' : ''} | hoek met M${startAdj + 1} en M${endAdj + 1}`}
                  className={`rounded-lg border px-1.5 py-2 text-center transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    ${isSel
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-dark-border bg-dark-card text-light/60 hover:border-light/30 hover:text-light'
                    }`}
                >
                  <div className="text-[9px] leading-none mb-0.5 opacity-70 flex items-center justify-between gap-0.5">
                    <span className="opacity-50 text-[8px]">M{startAdj + 1}⌐</span>
                    <span>M{i + 1}{isLocked ? ' 🔒' : ''}</span>
                    <span className="opacity-50 text-[8px]">⌐M{endAdj + 1}</span>
                  </div>
                  <div className="text-[11px] font-medium leading-none">
                    {len.toFixed(2)}<span className="text-[8px] ml-0.5 opacity-60">m</span>
                  </div>
                  {isSpecial && wallCount <= 6 && (
                    <div className="text-[7px] leading-none mt-0.5 opacity-30 truncate">
                      {startCornerShort}·{endCornerShort}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Edit area – visible when ≥1 wall is selected */}
          {selectedWallIndices.length > 0 && (
            <div className="rounded-lg bg-dark-card border border-dark-border p-3 mb-3 space-y-2.5">
              {/* Header row */}
              <div className="flex items-center justify-end mb-0.5">
                <span className="text-[11px] font-semibold text-accent/80 uppercase tracking-wider">Geselecteerd</span>
              </div>

              {selectedWallIndices.map(i => {
                const key = String(i);
                const curLen = wallLens[i];
                const isLocked = locks[i] ?? false;
                const wallLabel = wallCount === 4 ? `M${i + 1} — ${WALL_LABELS_4[i]}` : `Muur ${i + 1}`;
                const isFocused = snapFocusedKey === key;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      {/* Lock button – next to label, larger and prominent */}
                      <button
                        type="button"
                        onClick={() => toggleLock(i)}
                        disabled={room.isFinalized}
                        title={isLocked ? 'Muur ontgrendelen' : 'Muur vergrendelen'}
                        className={`shrink-0 p-1 rounded transition-colors cursor-pointer disabled:opacity-40
                          ${isLocked
                            ? 'text-accent bg-accent/10 border border-accent/30'
                            : 'text-light/40 hover:text-light/70 border border-transparent hover:border-dark-border'
                          }`}
                      >
                        {isLocked
                          ? <Lock size={14} strokeWidth={2.5} />
                          : <Unlock size={14} strokeWidth={2} />
                        }
                      </button>
                      <span className="text-[11px] font-medium text-light/70 shrink-0 w-20">{wallLabel}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={lengthStrings[key] ?? curLen.toFixed(2)}
                        onFocus={() => {
                          focusedLengthRef.current = key;
                          setSnapFocusedKey(key);
                        }}
                        onBlur={() => {
                          focusedLengthRef.current = null;
                          setSnapFocusedKey(null);
                          const raw = lengthStrings[key];
                          const n = parseFloat(raw);
                          if (isNaN(n) || n < 0.1) {
                            setLengthStrings(prev => ({ ...prev, [key]: curLen.toFixed(2) }));
                          } else {
                            applyWallLength(i, Math.max(0.1, n));
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setLengthStrings(prev => ({ ...prev, [key]: raw }));
                          const n = parseFloat(raw);
                          if (!isNaN(n) && n >= 0.1 && !raw.endsWith('.') && raw !== '') {
                            applyWallLength(i, Math.max(0.1, n));
                          }
                        }}
                        disabled={room.isFinalized || isLocked}
                        className={`flex-1 min-w-0 px-2 py-1.5 rounded bg-dark border text-light text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors
                          ${isFocused ? 'border-accent/60' : 'border-dark-border'}
                          ${(room.isFinalized || isLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-[10px] text-light/40 shrink-0">m</span>
                    </div>

                    {/* Magnetic snap suggestions – shown when this input is focused */}
                    {isFocused && snapSuggestions.length > 0 && (
                      <div className="pl-8 flex flex-wrap gap-1">
                        <span className="text-[9px] text-light/30 self-center mr-0.5">↔</span>
                        {snapSuggestions.map(val => {
                          const current = parseFloat(lengthStrings[key] ?? '0');
                          const isExact = Math.abs(val - current) < 0.01;
                          return (
                            <button
                              key={val}
                              type="button"
                              onMouseDown={(e) => {
                                // Prevent blur before click registers
                                e.preventDefault();
                                setLengthStrings(prev => ({ ...prev, [key]: val.toFixed(2) }));
                                applyWallLength(i, val);
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer
                                ${isExact
                                  ? 'bg-accent/20 border-accent/60 text-accent font-semibold'
                                  : 'bg-dark border-dark-border text-light/50 hover:border-accent/40 hover:text-accent'
                                }`}
                            >
                              {val.toFixed(2)}m
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <p className="text-[10px] text-light/30 pt-0.5">
                ↗ Sleep het blauwe punt op de kaart om de positie vrij aan te passen.
              </p>
            </div>
          )}
        </>
      )}

      {showHeights && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className={baseHeaderCls}>Muurhoogtes</h3>
            <button
              type="button"
              onClick={resetAllWalls}
              disabled={room.isFinalized}
              className="px-2.5 py-1 rounded text-[11px] font-medium bg-dark-card border border-dark-border text-light/60 hover:text-light hover:border-light/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Herstel standaard
            </button>
          </div>

          {canUseGlobalHeight && (
            <div className="mb-3">
              <label className="block text-xs text-light/50 mb-1">
                Hoogte van alle muren
              </label>
              <p className="text-[10px] text-light/40 mb-1">
                Standaard is elke muur even hoog aan beide zijden. Pas hier de hoogte
                van alle muren tegelijk aan.
              </p>
              <input
                type="number"
                step={0.1}
                min={0.1}
                value={room.height || ''}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  if (!isNaN(n)) updateAllWalls(n);
                }}
                disabled={room.isFinalized}
                className={`w-full px-2 py-1.5 rounded-lg bg-dark-card border border-dark-border text-light text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 ${
                  room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="w-full mb-3 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-dark-card border border-dark-border text-light/60 hover:text-light hover:border-light/40 transition-colors cursor-pointer"
          >
            {isExpanded
              ? '▲ Ongelijke hoogte verbergen'
              : '▼ Muren hebben ongelijke hoogte'}
          </button>

          {isExpanded && (
            <div className="space-y-2">
              {WALL_HEIGHT_KEYS.map((side, i) => {
                const wall = room.walls[side];
                const wallWidth = wallLens[i] ?? room.length;
                const area = calcWallArea(wall, wallWidth);
                const hLeft = wall.heightLeft;
                const hRight = wall.heightRight;
                const isSloped = hLeft !== hRight;
                const label = wallCount === 4 ? `Muur ${i + 1} — ${WALL_LABELS_4[i]}` : `Muur ${i + 1}`;

                return (
                  <div
                    key={side}
                    className="rounded-lg bg-dark-card border border-dark-border p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-light/70">{label}</span>
                      <span className="text-[10px] text-light/40">{area.toFixed(1)} m²</span>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1">
                        <label className="text-[10px] text-light/40">Hoogte linkerkant</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={getDisplayValue(side, 'heightLeft')}
                          onChange={(e) => handleWallChange(side, 'heightLeft', e.target.value)}
                          onBlur={() => handleWallBlur(side, 'heightLeft')}
                          disabled={room.isFinalized}
                          className={`w-full px-2 py-1 rounded bg-dark border border-dark-border text-light text-xs focus:outline-none focus:border-accent ${
                            room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                      <div className="text-[10px] text-light/30 mt-4">╱</div>
                      <div className="flex-1">
                        <label className="text-[10px] text-light/40">Hoogte rechterkant</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={getDisplayValue(side, 'heightRight')}
                          onChange={(e) => handleWallChange(side, 'heightRight', e.target.value)}
                          onBlur={() => handleWallBlur(side, 'heightRight')}
                          disabled={room.isFinalized}
                          className={`w-full px-2 py-1 rounded bg-dark border border-dark-border text-light text-xs focus:outline-none focus:border-accent ${
                            room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-light/40">
                        L: {hLeft.toFixed(1)}m ╱ R: {hRight.toFixed(1)}m
                        {isSloped && (
                          <span className="text-accent ml-2">&#x26A0; Schuin</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const base = room.height || 2.6;
                          const wc = room.wallsCustomized ?? { top: false, right: false, bottom: false, left: false };
                          onUpdate(room.id, {
                            walls: { ...room.walls, [side]: { heightLeft: base, heightRight: base } },
                            wallsCustomized: { ...wc, [side]: false },
                          });
                          setWallStrings(prev => ({
                            ...prev,
                            [`${side}_heightLeft`]: String(base),
                            [`${side}_heightRight`]: String(base),
                          }));
                        }}
                        disabled={room.isFinalized}
                        className="text-[10px] text-light/50 hover:text-light/80 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Herstel muur
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
