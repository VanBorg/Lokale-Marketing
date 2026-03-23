import { useState, useCallback } from 'react';
import type { Room } from '../../../lib/database.types';
import ProjectCanvas from '../canvas/ProjectCanvas';
import MakerPanel from '../maker/MakerPanel';

export default function TabBlauwdruk() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const handleAddRoom = useCallback(
    (data: Omit<Room, 'id' | 'project_id' | 'created_at'>) => {
      const room: Room = {
        ...data,
        id: crypto.randomUUID(),
        project_id: '',
        created_at: new Date().toISOString(),
      };
      setRooms(prev => [...prev, room]);
    },
    [],
  );

  const handleMoveRoom = useCallback((id: string, x: number, y: number) => {
    setRooms(prev =>
      prev.map(r => (r.id === id ? { ...r, position_x: x, position_y: y } : r)),
    );
  }, []);

  const handleDeleteRoom = useCallback((id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    setSelectedRoomId(null);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      <ProjectCanvas
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        onMoveRoom={handleMoveRoom}
        onDeleteRoom={handleDeleteRoom}
      />
      <MakerPanel onAddRoom={handleAddRoom} />
    </div>
  );
}
