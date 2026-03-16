import { useState, useEffect, useRef } from 'react';
import { Room, RoomWalls as RoomWallsType, WallSide, calcWallArea } from './types';

interface RoomWallsProps {
  room: Room;
  onUpdate: (id: string, updates: Partial<Room>) => void;
}

const WALL_DEFS = [
  { key: 'top' as const, label: 'Boven' },
  { key: 'right' as const, label: 'Rechts' },
  { key: 'bottom' as const, label: 'Onder' },
  { key: 'left' as const, label: 'Links' },
];

export default function RoomWalls({ room, onUpdate }: RoomWallsProps) {
  const rotated = room.rotation === 90 || room.rotation === 270;
  const [isExpanded, setIsExpanded] = useState(false);
  const [lengthsExpanded, setLengthsExpanded] = useState(false);
  const [wallStrings, setWallStrings] = useState<Record<string, string>>({});
  const [lengthStrings, setLengthStrings] = useState<Record<string, string>>(() => ({
    top: String(room.wallLengths?.top ?? room.length),
    right: String(room.wallLengths?.right ?? room.width),
    bottom: String(room.wallLengths?.bottom ?? room.length),
    left: String(room.wallLengths?.left ?? room.width),
  }));
  const focusedLengthRef = useRef<string | null>(null);

  useEffect(() => {
    setWallStrings({});
    setIsExpanded(false);
    setLengthsExpanded(false);
    setLengthStrings({
      top: String(room.wallLengths?.top ?? room.length),
      right: String(room.wallLengths?.right ?? room.width),
      bottom: String(room.wallLengths?.bottom ?? room.length),
      left: String(room.wallLengths?.left ?? room.width),
    });
  }, [room.id]);

  useEffect(() => {
    const wl = room.wallLengths ?? { top: room.length, right: room.width, bottom: room.length, left: room.width };
    setLengthStrings(prev => {
      const next = { ...prev };
      for (const k of ['top', 'right', 'bottom', 'left'] as const) {
        if (focusedLengthRef.current !== k) next[k] = String(wl[k]);
      }
      return next;
    });
  }, [room.wallLengths, room.length, room.width]);

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
    onUpdate(room.id, {
      height: h,
      walls: nextWalls,
    });
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

  const baseHeaderCls =
    'text-xs font-semibold text-light/50 uppercase tracking-wider';

  const inputCls = `w-full px-2 py-1 rounded bg-dark border border-dark-border text-light text-xs focus:outline-none focus:border-accent ${
    room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''
  }`;

  return (
    <div className="p-4 border-b border-dark-border">
      {/* Wall lengths section */}
      <div className="mb-4">
        <h3 className={`${baseHeaderCls} mb-2`}>Muurlengtes</h3>
        <button
          type="button"
          onClick={() => setLengthsExpanded(prev => !prev)}
          className="w-full mb-2 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-dark-card border border-dark-border text-light/60 hover:text-light hover:border-light/40 transition-colors cursor-pointer"
        >
          {lengthsExpanded ? '▲ Verbergen' : '▼ Lengtes aanpassen'}
        </button>

        {lengthsExpanded && (
          <div className="space-y-2">
            {WALL_DEFS.map((def, i) => {
              const wl = room.wallLengths ?? { top: room.length, right: room.width, bottom: room.length, left: room.width };
              return (
                <div key={def.key} className="rounded-lg bg-dark-card border border-dark-border p-2.5">
                  <label className="text-[10px] text-light/40">Muur {i + 1} — {def.label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lengthStrings[def.key] ?? String(wl[def.key])}
                    onFocus={() => { focusedLengthRef.current = def.key; }}
                    onBlur={() => {
                      focusedLengthRef.current = null;
                      const raw = lengthStrings[def.key];
                      const n = parseFloat(raw);
                      if (isNaN(n) || n < 0.1) {
                        setLengthStrings(prev => ({ ...prev, [def.key]: String(wl[def.key]) }));
                      } else {
                        const val = Math.max(0.1, n);
                        setLengthStrings(prev => ({ ...prev, [def.key]: String(val) }));
                        onUpdate(room.id, { wallLengths: { ...wl, [def.key]: val } });
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setLengthStrings(prev => ({ ...prev, [def.key]: raw }));
                      const n = parseFloat(raw);
                      if (!isNaN(n) && n >= 0.1 && !raw.endsWith('.') && raw !== '') {
                        onUpdate(room.id, { wallLengths: { ...wl, [def.key]: Math.max(0.1, n) } });
                      }
                    }}
                    disabled={room.isFinalized}
                    className={inputCls}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wall heights section */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={`${baseHeaderCls}`}>Muurhoogtes</h3>
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
          {WALL_DEFS.map((def, i) => {
            const wall = room.walls[def.key];
            const wl = room.wallLengths ?? { top: room.length, right: room.width, bottom: room.length, left: room.width };
            const wallWidth = wl[def.key];
            const area = calcWallArea(wall, wallWidth);
            const hLeft = wall.heightLeft;
            const hRight = wall.heightRight;
            const isSloped = hLeft !== hRight;

            return (
              <div
                key={def.key}
                className="rounded-lg bg-dark-card border border-dark-border p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-light/70">
                    Muur {i + 1} — {def.label}
                  </span>
                  <span className="text-[10px] text-light/40">
                    {area.toFixed(1)} m²
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1">
                    <label className="text-[10px] text-light/40">Hoogte linkerkant</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={getDisplayValue(def.key, 'heightLeft')}
                      onChange={(e) =>
                        handleWallChange(def.key, 'heightLeft', e.target.value)
                      }
                      onBlur={() => handleWallBlur(def.key, 'heightLeft')}
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
                      value={getDisplayValue(def.key, 'heightRight')}
                      onChange={(e) =>
                        handleWallChange(def.key, 'heightRight', e.target.value)
                      }
                      onBlur={() => handleWallBlur(def.key, 'heightRight')}
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
                      <span className="text-accent ml-2">⚠ Schuin</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const base = room.height || 2.6;
                      const wc = room.wallsCustomized ?? { top: false, right: false, bottom: false, left: false };
                      onUpdate(room.id, {
                        walls: { ...room.walls, [def.key]: { heightLeft: base, heightRight: base } },
                        wallsCustomized: { ...wc, [def.key]: false },
                      });
                      setWallStrings(prev => ({
                        ...prev,
                        [`${def.key}_heightLeft`]: String(base),
                        [`${def.key}_heightRight`]: String(base),
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
