import { useMemo } from 'react';
import { Floor, Room } from '../types';
import EtageTabBar from './EtageTabBar';

interface KamerSelectorProps {
  floors: Floor[];
  activeFloorId: string;
  onFloorChange: (floorId: string) => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  emptyAction?: () => void;
  emptyLabel?: string;
}

function RoomButton({ room, isSelected, isChild, onClick }: {
  room: Room; isSelected: boolean; isChild: boolean; onClick: () => void;
}) {
  const area = room.length * room.width;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer
        ${isChild ? 'ml-4' : ''}
        ${isSelected
          ? 'border-accent bg-accent/5'
          : 'border-dark-border bg-dark-card hover:border-light/20'
        }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-light">
          {isChild && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
          {room.name}
        </span>
        <span className="text-xs text-light/40">{area.toFixed(1)} m²</span>
      </div>
      <div className={`text-xs text-light/40 mt-0.5 ${isChild ? 'ml-3' : ''}`}>
        {room.elements.length} element{room.elements.length !== 1 ? 'en' : ''}
      </div>
    </button>
  );
}

export default function KamerSelector({
  floors,
  activeFloorId,
  onFloorChange,
  selectedRoomId,
  onSelectRoom,
  emptyAction,
  emptyLabel,
}: KamerSelectorProps) {
  const activeFloor = floors.find(f => f.id === activeFloorId);
  const rooms: Room[] = activeFloor?.rooms ?? [];

  const groupedRooms = useMemo(
    () => rooms.map((room) => ({ room, isChild: room.isSubRoom })),
    [rooms],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
          Kamers
        </h3>

        {rooms.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-light/40 mb-3">
              Ga eerst naar Plattegrond om kamers toe te voegen
            </p>
            {emptyAction && (
              <button
                onClick={emptyAction}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer"
              >
                {emptyLabel ?? '← Naar Plattegrond'}
              </button>
            )}
          </div>
        )}

        {groupedRooms.map(({ room, isChild }) => (
          <RoomButton
            key={room.id}
            room={room}
            isSelected={room.id === selectedRoomId}
            isChild={isChild}
            onClick={() => onSelectRoom(room.id)}
          />
        ))}
      </div>

      <div className="shrink-0 border-t border-dark-border">
        <EtageTabBar
          floors={floors}
          activeFloorId={activeFloorId}
          onFloorChange={onFloorChange}
        />
      </div>
    </div>
  );
}
