import { useState } from 'react';
import { Room, calcTotalWalls, polygonArea, positionSpecialOnWall, getAdjacentOrContainedRooms } from './types';
import RoomWalls from './RoomWalls';

interface RoomPropertiesProps {
  room: Room;
  rooms: Room[];
  onUpdate: (id: string, updates: Partial<Room>) => void;
  onDelete: (id: string) => void;
  selectedWallIndices: number[];
  onToggleWallIndex: (i: number) => void;
}

function parseNum(value: string, fallback: number): number {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

/** Reusable Lengte/Breedte/Hoogte inputs for use in Afmetingen and under Speciale ruimtes. */
export function RoomDimensionInputs({
  room,
  onUpdate,
  disabled,
  inputCls = 'w-full px-2 py-1.5 rounded-lg bg-dark-card border border-dark-border text-light text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50',
}: {
  room: Room;
  onUpdate: (id: string, updates: Partial<Room>) => void;
  disabled?: boolean;
  inputCls?: string;
}) {
  const cls = `${inputCls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className="block text-xs text-light/50 mb-1">Lengte (m)</label>
        <input
          type="number"
          step={0.1}
          min={1}
          value={room.length || ''}
          onChange={(e) => {
            const v = e.target.value;
            onUpdate(room.id, { length: v === '' ? 0 : parseNum(v, 0) });
          }}
          disabled={disabled}
          className={cls}
        />
      </div>
      <div>
        <label className="block text-xs text-light/50 mb-1">Breedte (m)</label>
        <input
          type="number"
          step={0.1}
          min={1}
          value={room.width || ''}
          onChange={(e) => {
            const v = e.target.value;
            onUpdate(room.id, { width: v === '' ? 0 : parseNum(v, 0) });
          }}
          disabled={disabled}
          className={cls}
        />
      </div>
      <div>
        <label className="block text-xs text-light/50 mb-1">Hoogte (m)</label>
        <input
          type="number"
          step={0.1}
          min={2}
          value={room.height || ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') {
              onUpdate(room.id, { height: 0 });
              return;
            }
            const h = parseNum(v, 0);
            const wc = room.wallsCustomized ?? { top: false, right: false, bottom: false, left: false };
            const side = { heightLeft: h, heightRight: h };
            const newWalls = {
              top: wc.top ? room.walls.top : side,
              right: wc.right ? room.walls.right : side,
              bottom: wc.bottom ? room.walls.bottom : side,
              left: wc.left ? room.walls.left : side,
            };
            onUpdate(room.id, { height: h, walls: newWalls });
          }}
          disabled={disabled}
          className={cls}
        />
      </div>
    </div>
  );
}

export default function RoomProperties({ room, rooms, onUpdate, onDelete, selectedWallIndices, onToggleWallIndex }: RoomPropertiesProps) {
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSubRoomConfirm, setShowSubRoomConfirm] = useState(false);
  const floor = room.vertices && room.vertices.length >= 3 ? polygonArea(room.vertices) : room.length * room.width;
  const walls = calcTotalWalls(room);
  const childRooms = rooms.filter(r => r.parentRoomId === room.id);
  const allChildAndSpecialRooms = getAdjacentOrContainedRooms(room, rooms);
  const insideChildren = childRooms.filter(r => r.attachedWall === 'inside');
  const insideSubtraction = insideChildren.reduce((sum, c) => sum + (c.vertices && c.vertices.length >= 3 ? polygonArea(c.vertices) : c.length * c.width), 0);
  const netFloor = floor - insideSubtraction;
  const parentRoom = room.parentRoomId ? rooms.find(r => r.id === room.parentRoomId) : null;

  let ceiling = floor;
  if (room.ridgeCeiling && room.ridgeHeight > room.height) {
    const halfWidth = room.width / 2;
    const rise = room.ridgeHeight - room.height;
    const slopeLength = Math.sqrt(halfWidth * halfWidth + rise * rise);
    ceiling = 2 * room.length * slopeLength;
  } else if (room.slopedCeiling && room.highestPoint > room.height) {
    const angle = Math.atan((room.highestPoint - room.height) / room.width);
    ceiling = floor / Math.cos(angle);
  }

  const inputCls =
    'w-full px-2 py-1.5 rounded-lg bg-dark-card border border-dark-border text-light text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50';

  return (
    <div className="p-4 border-b border-dark-border">
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-3">
        Afmetingen
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-light/70 mb-1">Naam</label>
          <input
            type="text"
            value={room.name}
            onChange={(e) => onUpdate(room.id, { name: e.target.value })}
            disabled={room.isFinalized}
            className={`${inputCls} px-3 ${room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Position along wall for special rooms attached to a wall */}
        {parentRoom && room.attachedWall && room.attachedWall !== 'inside' && (
          <div>
            <label className="block text-sm font-medium text-light/70 mb-1">
              Positie langs muur
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={room.wallOffset ?? 0}
              onChange={(e) => {
                const off = parseFloat(e.target.value);
                const pos = positionSpecialOnWall(room, parentRoom, room.attachedWall!, off);
                onUpdate(room.id, { wallOffset: off, x: pos.x, y: pos.y });
              }}
              disabled={room.isFinalized}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-accent disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-light/50 mt-0.5">
              <span>{room.attachedWall === 'left' || room.attachedWall === 'right' ? 'Boven' : 'Links'}</span>
              <span>{room.attachedWall === 'left' || room.attachedWall === 'right' ? 'Onder' : 'Rechts'}</span>
            </div>
          </div>
        )}

        <RoomDimensionInputs room={room} onUpdate={onUpdate} disabled={room.isFinalized} inputCls={inputCls} />

        <div className="rounded-lg bg-dark-card border border-dark-border p-3 space-y-1.5">
          {insideChildren.length > 0 ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-light/40">Vloer (bruto)</span>
                <span className="text-light/60">{floor.toFixed(1)} m²</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-accent/60">Aftrek sub-ruimtes</span>
                <span className="text-accent/60">-{insideSubtraction.toFixed(1)} m²</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-light/60">Vloer (netto)</span>
                <span className="text-light/80">{netFloor.toFixed(1)} m²</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs">
              <span className="text-light/40">Vloer</span>
              <span className="text-light/60">{floor.toFixed(1)} m²</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-light/40">Wanden</span>
            <span className="text-light/60">{walls.toFixed(1)} m²</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-light/40">Plafond</span>
            <span className="text-light/60">{ceiling.toFixed(1)} m²</span>
          </div>

          <div className="pt-1.5 border-t border-dark-border space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={room.slopedCeiling}
                onChange={(e) => onUpdate(room.id, {
                  slopedCeiling: e.target.checked,
                  ...(e.target.checked ? { ridgeCeiling: false } : {}),
                })}
                className="accent-accent w-3.5 h-3.5"
              />
              <span className="text-xs text-light/50">Schuin plafond</span>
            </label>

            {room.slopedCeiling && (
              <div className="ml-5">
                <label className="block text-[10px] text-light/40 mb-0.5">Hoogste punt (m)</label>
                <input
                  type="number" step={0.1} min={room.height} value={room.highestPoint || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdate(room.id, { highestPoint: v === '' ? 0 : parseNum(v, 0) });
                  }}
                  disabled={room.isFinalized}
                  className={`w-full px-2 py-1 rounded bg-dark border border-dark-border
                    text-light text-xs focus:outline-none focus:border-accent ${room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={room.ridgeCeiling ?? false}
                onChange={(e) => onUpdate(room.id, {
                  ridgeCeiling: e.target.checked,
                  ...(e.target.checked ? { slopedCeiling: false } : {}),
                })}
                className="accent-accent w-3.5 h-3.5"
              />
              <span className="text-xs text-light/50">Punt plafond</span>
            </label>

            {room.ridgeCeiling && (
              <div className="ml-5">
                <label className="block text-[10px] text-light/40 mb-0.5">Nokhoogte (hoogste punt) (m)</label>
                <input
                  type="number" step={0.1} min={room.height} value={room.ridgeHeight || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdate(room.id, { ridgeHeight: v === '' ? 0 : parseNum(v, 0) });
                  }}
                  disabled={room.isFinalized}
                  className={`w-full px-2 py-1 rounded bg-dark border border-dark-border
                    text-light text-xs focus:outline-none focus:border-accent ${room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            )}
          </div>
        </div>

        <RoomWalls
          room={room}
          rooms={rooms}
          onUpdate={onUpdate}
          selectedWallIndices={selectedWallIndices}
          onToggleWallIndex={onToggleWallIndex}
        />

        {!room.isFinalized ? (
          <div>
            <button
              onClick={() => {
                setFinalizeError(null);
                if (!room.name.trim() || room.length <= 0 || room.width <= 0 || room.height <= 0) {
                  setFinalizeError('Vul alle afmetingen in voor je de kamer definitief maakt.');
                  return;
                }
                const allWallsValid = Object.values(room.walls).every(
                  w => w.heightLeft > 0 && w.heightRight > 0
                );
                if (!allWallsValid) {
                  setFinalizeError('Vul alle muurhoogtes in. Hoogte moet groter zijn dan 0.');
                  return;
                }
                if (room.isSubRoom && parentRoom && !parentRoom.isFinalized) {
                  setFinalizeError(`Let op: '${room.name}' is onderdeel van '${parentRoom.name}'. Maak eerst de hoofdkamer definitief.`);
                  return;
                }
                if (allChildAndSpecialRooms.length > 0) {
                  setShowSubRoomConfirm(true);
                  return;
                }
                onUpdate(room.id, { isFinalized: true });
                allChildAndSpecialRooms.forEach((c) => onUpdate(c.id, { isFinalized: true }));
              }}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium
                bg-green-500/10 text-green-400 border border-green-500/20
                hover:bg-green-500/20 transition-colors cursor-pointer"
            >
              Definitief maken
            </button>
            {finalizeError && (
              <p className="mt-1.5 text-xs text-red-400">{finalizeError}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-dark-card border border-dark-border p-2.5">
            <span className="text-xs text-light/40">Afmetingen vastgesteld</span>
            <button
              onClick={() => {
                onUpdate(room.id, { isFinalized: false });
                allChildAndSpecialRooms.forEach((c) => onUpdate(c.id, { isFinalized: false }));
              }}
              className="px-2.5 py-1 rounded text-xs font-medium
                bg-accent/10 text-accent border border-accent/20
                hover:bg-accent/20 transition-colors cursor-pointer"
            >
              Bewerken
            </button>
          </div>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium
            bg-red-500/10 text-red-400 border border-red-500/20
            hover:bg-red-500/20 transition-colors cursor-pointer"
        >
          Kamer verwijderen
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-light/90 mb-4">
              Weet je zeker dat je <span className="font-medium text-light">{room.name}</span> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium
                  bg-red-500/20 text-red-400 border border-red-500/30
                  hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Nee
              </button>
              <button
                onClick={() => {
                  onDelete(room.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium
                  bg-green-500/20 text-green-400 border border-green-500/30
                  hover:bg-green-500/30 transition-colors cursor-pointer"
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubRoomConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSubRoomConfirm(false)}>
          <div
            className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-light/90 mb-4">
              Je kamer &apos;{room.name}&apos; bevat {allChildAndSpecialRooms.length} aanliggende ruimte(s): {allChildAndSpecialRooms.map(c => c.name).join(', ')}.
              Deze worden meegenomen als onderdeel van deze kamer. Wil je doorgaan?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSubRoomConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium
                  bg-dark-hover text-light/60 border border-dark-border
                  hover:text-light transition-colors cursor-pointer"
              >
                Nee
              </button>
              <button
                onClick={() => {
                  onUpdate(room.id, { isFinalized: true });
                  allChildAndSpecialRooms.forEach((c) => onUpdate(c.id, { isFinalized: true }));
                  setShowSubRoomConfirm(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium
                  bg-green-500/20 text-green-400 border border-green-500/30
                  hover:bg-green-500/30 transition-colors cursor-pointer"
              >
                Ja, doorgaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
