import { useState, useEffect, useRef } from 'react';
import {
  Room,
  RoomWalls as RoomWallsType,
  WallSide,
  calcWallArea,
  ensureVertices,
  vertexWallLengths,
  updateVertexWallLength,
  syncRoomFromVertices,
  PX_PER_M,
} from './types';

interface RoomWallsProps {
  room: Room;
  onUpdate: (id: string, updates: Partial<Room>) => void;
  selectedWallIndices: number[];
  onToggleWallIndex: (i: number) => void;
}

const WALL_LABELS_4 = ['Boven', 'Rechts', 'Onder', 'Links'];
const WALL_HEIGHT_KEYS: (keyof RoomWallsType)[] = ['top', 'right', 'bottom', 'left'];

export default function RoomWalls({ room, onUpdate, selectedWallIndices, onToggleWallIndex }: RoomWallsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [wallStrings, setWallStrings] = useState<Record<string, string>>({});
  const [lengthStrings, setLengthStrings] = useState<Record<string, string>>({});
  const focusedLengthRef = useRef<string | null>(null);

  const verts = ensureVertices(room);
  const wallLens = vertexWallLengths(verts);
  const wallCount = verts.length;
  const locks = room.wallLocks ?? new Array(wallCount).fill(false);

  useEffect(() => {
    setWallStrings({});
    setIsExpanded(false);
    const strs: Record<string, string> = {};
    wallLens.forEach((len, i) => { strs[String(i)] = len.toFixed(2); });
    setLengthStrings(strs);
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
  }, [room.vertices, room.wallLengths, room.length, room.width]);

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

  return (
    <div className="p-4 border-b border-dark-border">

      {/* ── Wall lengths ── */}
      <h3 className={`${baseHeaderCls} mb-2`}>Muurlengtes</h3>

      {/* Compact chip grid – 3 columns */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {Array.from({ length: wallCount }, (_, i) => {
          const len = wallLens[i];
          const isLocked = locks[i] ?? false;
          const isSel = selectedWallIndices.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => !room.isFinalized && onToggleWallIndex(i)}
              disabled={room.isFinalized}
              title={`Muur ${i + 1} — ${len.toFixed(2)} m${isLocked ? ' (vergrendeld)' : ''}`}
              className={`rounded-lg border px-1.5 py-2 text-center transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${isSel
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark-card text-light/60 hover:border-light/30 hover:text-light'
                }`}
            >
              <div className="text-[9px] leading-none mb-0.5 opacity-70">
                M{i + 1}{isLocked ? ' 🔒' : ''}
              </div>
              <div className="text-[11px] font-medium leading-none">
                {len.toFixed(2)}<span className="text-[8px] ml-0.5 opacity-60">m</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Edit area – visible when ≥1 wall is selected */}
      {selectedWallIndices.length > 0 && (
        <div className="rounded-lg bg-dark-card border border-dark-border p-3 mb-3 space-y-2">
          <div className="text-[10px] font-semibold text-light/40 uppercase tracking-wider mb-1">Geselecteerd</div>
          {selectedWallIndices.map(i => {
            const key = String(i);
            const curLen = wallLens[i];
            const isLocked = locks[i] ?? false;
            const wallLabel = wallCount === 4 ? `Muur ${i + 1} — ${WALL_LABELS_4[i]}` : `Muur ${i + 1}`;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-light/50 w-14 shrink-0">{wallLabel}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={lengthStrings[key] ?? curLen.toFixed(2)}
                  onFocus={() => { focusedLengthRef.current = key; }}
                  onBlur={() => {
                    focusedLengthRef.current = null;
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
                  className={`flex-1 min-w-0 px-2 py-1 rounded bg-dark border border-dark-border text-light text-xs focus:outline-none focus:border-accent
                    ${(room.isFinalized || isLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <span className="text-[10px] text-light/40 shrink-0">m</span>
                <button
                  type="button"
                  onClick={() => toggleLock(i)}
                  disabled={room.isFinalized}
                  className="shrink-0 text-[11px] px-1 py-0.5 cursor-pointer disabled:opacity-40"
                  title={isLocked ? 'Muur ontgrendelen' : 'Muur vergrendelen'}
                >
                  {isLocked ? <span className="text-accent">🔒</span> : <span className="text-light/30">🔓</span>}
                </button>
              </div>
            );
          })}
          <p className="text-[10px] text-accent/60 pt-1">
            ↗ Sleep het blauwe punt op de kaart om de positie vrij aan te passen.
          </p>
        </div>
      )}

      {/* ── Wall heights ── */}
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
    </div>
  );
}
