import { useState, type ReactNode } from 'react';
import {
  Room,
  ROOM_TYPE_ICONS,
  calcTotalWalls,
  polygonArea,
  getDependentRoomsForFinalization,
  isSpecialRoom,
  isSpecialRoomRechtRotation,
  SPECIAL_ROOM_SCHUIN_ROTATION_DEG,
} from './types';
import RoomWalls from './RoomWalls';

interface RoomEditPanelProps {
  room: Room;
  rooms: Room[];
  onUpdate: (id: string, updates: Partial<Room>) => void;
  onDelete: (id: string) => void;
  selectedWallIndices: number[];
  onToggleWallIndex: (i: number) => void;
  onBack: () => void;
}

function parseNum(value: string, fallback: number): number {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

const ROOM_ROTATIONS = [0, 90, 180, 270] as const;

/**
 * Speciale kamers: alleen rechthoekig op het rooster (recht) of diagonaal (schuin).
 * Geen losse 0°/90°/180°/270° knoppen.
 */
export function SpecialRoomOrientationPicker({
  room,
  onUpdateRoom,
  disabled,
  className = '',
}: {
  room: Room;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  disabled?: boolean;
  className?: string;
}) {
  const recht = isSpecialRoomRechtRotation(room.rotation);
  const btn = (active: boolean) => `
    px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${active
      ? 'bg-accent text-white'
      : 'bg-dark-card border border-dark-border text-light/60 hover:border-light/30 hover:text-light'
    }
  `;
  return (
    <div className={className}>
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
        Oriëntatie
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onUpdateRoom(room.id, { rotation: 0 })}
          className={btn(recht)}
        >
          Recht
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onUpdateRoom(room.id, { rotation: SPECIAL_ROOM_SCHUIN_ROTATION_DEG })}
          className={btn(!recht)}
        >
          Schuin
        </button>
      </div>
    </div>
  );
}

/** 0° / 90° / 180° / 270° — normale kamers; shared with RoomShapes (overview) and RoomEditPanel. */
export function RoomRotationPicker({
  room,
  onUpdateRoom,
  disabled,
  className = '',
}: {
  room: Room;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  disabled?: boolean;
  className?: string;
}) {
  const current = ((room.rotation ?? 0) % 360 + 360) % 360;
  return (
    <div className={className}>
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
        Roteer kamer
      </h3>
      <div className="grid grid-cols-4 gap-1.5">
        {ROOM_ROTATIONS.map(deg => (
          <button
            key={deg}
            type="button"
            disabled={disabled}
            onClick={() => onUpdateRoom(room.id, { rotation: deg })}
            className={`
              px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${current === deg
                ? 'bg-accent text-white'
                : 'bg-dark-card border border-dark-border text-light/60 hover:border-light/30 hover:text-light'
              }
            `}
          >
            {deg}°
          </button>
        ))}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-dark-border bg-dark-card/40">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 text-left text-sm font-medium text-light/70 hover:text-light transition-colors cursor-pointer"
      >
        {isOpen ? '▼' : '▶'} {title}
      </button>
      <div className={`grid transition-all duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

export function RoomDimensionInputs({
  room,
  onUpdate,
  disabled,
}: {
  room: Room;
  onUpdate: (id: string, updates: Partial<Room>) => void;
  disabled?: boolean;
}) {
  const inputCls = `w-full px-2 py-1.5 rounded-lg bg-dark-card border border-dark-border text-light text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
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
          className={inputCls}
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
          className={inputCls}
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
          className={inputCls}
        />
      </div>
    </div>
  );
}

export default function RoomEditPanel({
  room,
  rooms,
  onUpdate,
  onDelete,
  selectedWallIndices,
  onToggleWallIndex,
  onBack,
}: RoomEditPanelProps) {
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSubRoomConfirm, setShowSubRoomConfirm] = useState(false);
  const [showWallLengths, setShowWallLengths] = useState(false);
  const [showWallHeights, setShowWallHeights] = useState(false);
  const [showCeiling, setShowCeiling] = useState(false);

  const floor = room.vertices && room.vertices.length >= 3 ? polygonArea(room.vertices) : room.length * room.width;
  const walls = calcTotalWalls(room);
  const childRooms = rooms.filter(r => r.parentRoomId === room.id);
  const allChildAndSpecialRooms = getDependentRoomsForFinalization(room, rooms);
  const insideChildren = childRooms.filter(r => r.attachedWall === 'inside');
  const insideSubtraction = insideChildren.reduce((sum, c) => sum + (c.vertices && c.vertices.length >= 3 ? polygonArea(c.vertices) : c.length * c.width), 0);
  const netFloor = floor - insideSubtraction;
  const parentRoom = room.parentRoomId ? rooms.find(r => r.id === room.parentRoomId) : null;
  const icon = room.roomType !== 'normal' ? (ROOM_TYPE_ICONS[room.roomType] ?? '') : '';

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

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="p-4 border-b border-dark-border space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-2 py-1 rounded-md border border-dark-border text-light/70 hover:text-light hover:border-light/40 transition-colors cursor-pointer"
          >
            ←
          </button>
          <input
            type="text"
            value={room.name}
            onChange={(e) => onUpdate(room.id, { name: e.target.value })}
            disabled={room.isFinalized}
            className={`flex-1 px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-light text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 ${room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {icon && <span className="text-lg leading-none">{icon}</span>}
        </div>

        {isSpecialRoom(room) ? (
          <SpecialRoomOrientationPicker
            room={room}
            onUpdateRoom={onUpdate}
            disabled={room.isFinalized}
          />
        ) : (
          <RoomRotationPicker
            room={room}
            onUpdateRoom={onUpdate}
            disabled={room.isFinalized}
          />
        )}

        <RoomDimensionInputs room={room} onUpdate={onUpdate} disabled={room.isFinalized} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        <CollapsibleSection
          title="Muurlengtes"
          isOpen={showWallLengths}
          onToggle={() => setShowWallLengths(prev => !prev)}
        >
          <RoomWalls
            room={room}
            rooms={rooms}
            onUpdate={onUpdate}
            selectedWallIndices={selectedWallIndices}
            onToggleWallIndex={onToggleWallIndex}
            section="lengths"
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Muurhoogtes"
          isOpen={showWallHeights}
          onToggle={() => setShowWallHeights(prev => !prev)}
        >
          <RoomWalls
            room={room}
            rooms={rooms}
            onUpdate={onUpdate}
            selectedWallIndices={selectedWallIndices}
            onToggleWallIndex={onToggleWallIndex}
            section="heights"
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Plafond opties"
          isOpen={showCeiling}
          onToggle={() => setShowCeiling(prev => !prev)}
        >
          <div className="p-3 border-t border-dark-border space-y-2">
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
              <span className="text-xs text-light/60">Schuin plafond</span>
            </label>
            {room.slopedCeiling && (
              <div>
                <label className="block text-[11px] text-light/40 mb-1">Hoogste punt (m)</label>
                <input
                  type="number"
                  step={0.1}
                  min={room.height}
                  value={room.highestPoint || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdate(room.id, { highestPoint: v === '' ? 0 : parseNum(v, 0) });
                  }}
                  disabled={room.isFinalized}
                  className={`w-full px-2 py-1.5 rounded bg-dark border border-dark-border text-light text-xs focus:outline-none focus:border-accent ${room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              <span className="text-xs text-light/60">Punt plafond</span>
            </label>
            {room.ridgeCeiling && (
              <div>
                <label className="block text-[11px] text-light/40 mb-1">Nokhoogte (m)</label>
                <input
                  type="number"
                  step={0.1}
                  min={room.height}
                  value={room.ridgeHeight || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdate(room.id, { ridgeHeight: v === '' ? 0 : parseNum(v, 0) });
                  }}
                  disabled={room.isFinalized}
                  className={`w-full px-2 py-1.5 rounded bg-dark border border-dark-border text-light text-xs focus:outline-none focus:border-accent ${room.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      <div className="px-4 pb-3">
        <div className="rounded-lg bg-dark-card border border-dark-border p-3 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-light/40">Vloer</span>
            <span className="text-light/70">{floor.toFixed(1)} m²</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-light/40">Wanden</span>
            <span className="text-light/70">{walls.toFixed(1)} m²</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-light/40">Plafond</span>
            <span className="text-light/70">{ceiling.toFixed(1)} m²</span>
          </div>
          {insideChildren.length > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 mt-1 border-t border-dark-border">
              <span className="text-accent/80">Netto vloer</span>
              <span className="text-accent/90">{netFloor.toFixed(1)} m²</span>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-dark-border pt-3 bg-dark">
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
                  if (room.roomType !== 'normal' && room.parentRoomId) {
                    const parent = rooms.find(r => r.id === room.parentRoomId);
                    if (parent && !parent.isFinalized) {
                      setFinalizeError(`'${room.name}' is gekoppeld aan '${parent.name}'. Maak eerst die kamer definitief.`);
                      return;
                    }
                  }
                  if (allChildAndSpecialRooms.length > 0) {
                    setShowSubRoomConfirm(true);
                    return;
                  }
                  onUpdate(room.id, { isFinalized: true });
                  allChildAndSpecialRooms.forEach((c) => onUpdate(c.id, { isFinalized: true }));
                }}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer"
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
                className="px-2.5 py-1 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer"
              >
                Bewerken
              </button>
            </div>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            Kamer verwijderen
          </button>
        </div>
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Nee
              </button>
              <button
                onClick={() => {
                  onDelete(room.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors cursor-pointer"
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors cursor-pointer"
              >
                Nee
              </button>
              <button
                onClick={() => {
                  onUpdate(room.id, { isFinalized: true });
                  allChildAndSpecialRooms.forEach((c) => onUpdate(c.id, { isFinalized: true }));
                  setShowSubRoomConfirm(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors cursor-pointer"
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
