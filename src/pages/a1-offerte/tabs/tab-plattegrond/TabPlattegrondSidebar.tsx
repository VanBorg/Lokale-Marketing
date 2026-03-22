import type { RefObject } from 'react';
import type { Room, RoomType } from '../../types';
import RoomShapes, { SpecialRoomsSection } from '../../sidebar/RoomShapes';
import RoomEditPanel from '../../RoomEditPanel';
import FreeFormBuilder from '../../FreeFormBuilder';

interface TabPlattegrondSidebarProps {
  sidebarRef: RefObject<HTMLDivElement | null>;
  showFreeFormBuilder: boolean;
  setShowFreeFormBuilder: (v: boolean) => void;
  addFreeFormRoom: (rawVertices: { x: number; y: number }[]) => void;
  sidebarView: 'overview' | 'edit';
  lastShape: string | null;
  addRoom: (shape: string) => void;
  selectedRoom: Room | null;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  rooms: Room[];
  deleteRoom: (id: string) => void;
  selectedWallIndices: number[];
  toggleWallIndex: (i: number) => void;
  setSidebarView: (v: 'overview' | 'edit') => void;
  setSelectedRoomId: (id: string | null) => void;
  startPendingSpecialRoom: (type: RoomType, name: string, length: number, width: number) => void;
  totalRooms: number;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;
}

export default function TabPlattegrondSidebar({
  sidebarRef,
  showFreeFormBuilder,
  setShowFreeFormBuilder,
  addFreeFormRoom,
  sidebarView,
  lastShape,
  addRoom,
  selectedRoom,
  updateRoom,
  rooms,
  deleteRoom,
  selectedWallIndices,
  toggleWallIndex,
  setSidebarView,
  setSelectedRoomId,
  startPendingSpecialRoom,
  totalRooms,
  setActiveTab,
}: TabPlattegrondSidebarProps) {
  return (
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
                <SpecialRoomsSection onAddSpecialRoom={startPendingSpecialRoom} />
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
  );
}
