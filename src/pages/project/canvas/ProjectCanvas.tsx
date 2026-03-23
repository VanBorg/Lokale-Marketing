import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type { Room } from '../../../lib/database.types';
import CanvasRoom from './CanvasRoom';
import CanvasElements from './CanvasElements';
import { snapPosition } from './CanvasSnapping';

interface ProjectCanvasProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
  onMoveRoom: (id: string, x: number, y: number) => void;
  onDeleteRoom: (id: string) => void;
}

export default function ProjectCanvas({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onMoveRoom,
  onDeleteRoom,
}: ProjectCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRoomId) {
        onDeleteRoom(selectedRoomId);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedRoomId, onDeleteRoom]);

  const handleDragEnd = useCallback(
    (room: Room, x: number, y: number) => {
      const others = rooms
        .filter(r => r.id !== room.id)
        .map(r => ({
          x: r.position_x,
          y: r.position_y,
          width: (r.width ?? 3) * 80,
          height: (r.height ?? 3) * 80,
        }));

      const snapped = snapPosition(
        { x, y, width: (room.width ?? 3) * 80, height: (room.height ?? 3) * 80 },
        others,
      );
      onMoveRoom(room.id, snapped.x, snapped.y);
    },
    [rooms, onMoveRoom],
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-[400px] bg-dark rounded-lg border border-dark-border overflow-hidden cursor-crosshair"
      onClick={() => onSelectRoom(null)}
    >
      <Stage width={size.width} height={size.height}>
        <Layer>
          <Rect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            fill="#1a1a1a"
          />
          {rooms.map(room => (
            <CanvasRoom
              key={room.id}
              room={room}
              isSelected={room.id === selectedRoomId}
              onSelect={() => onSelectRoom(room.id)}
              onDragEnd={(x, y) => handleDragEnd(room, x, y)}
            />
          ))}
          {rooms.map(room => (
            <CanvasElements
              key={`el-${room.id}`}
              subRooms={room.sub_rooms ?? []}
              parentX={room.position_x}
              parentY={room.position_y}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
