import { Group, Rect, Text } from 'react-konva';
import type { Room } from '../../../lib/database.types';

const SCALE = 80;

interface CanvasRoomProps {
  room: Room;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
}

export default function CanvasRoom({
  room,
  isSelected,
  onSelect,
  onDragEnd,
  onDragMove,
}: CanvasRoomProps) {
  const w = (room.width ?? 3) * SCALE;
  const h = (room.height ?? 3) * SCALE;
  const area = room.area_m2 ?? ((room.width ?? 3) * (room.height ?? 3));

  return (
    <Group
      x={room.position_x}
      y={room.position_y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={e => {
        onDragMove?.(e.target.x(), e.target.y());
      }}
      onDragEnd={e => {
        onDragEnd(e.target.x(), e.target.y());
      }}
    >
      <Rect
        width={w}
        height={h}
        fill={isSelected ? 'rgba(53, 180, 211, 0.12)' : 'rgba(255, 255, 255, 0.04)'}
        stroke={isSelected ? '#35B4D3' : '#444'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={4}
      />
      <Text
        text={room.name ?? 'Kamer'}
        x={8}
        y={8}
        fontSize={13}
        fontFamily="DM Sans"
        fontStyle="bold"
        fill="#fff"
      />
      <Text
        text={`${area.toFixed(1)} m²`}
        x={8}
        y={24}
        fontSize={11}
        fontFamily="DM Sans"
        fill="rgba(255,255,255,0.5)"
      />

      {/* Dimension labels */}
      <Text
        text={`${(room.width ?? 3).toFixed(2)} m`}
        x={w / 2 - 20}
        y={h + 6}
        fontSize={10}
        fontFamily="DM Sans"
        fill="rgba(255,255,255,0.35)"
      />
      <Text
        text={`${(room.height ?? 3).toFixed(2)} m`}
        x={w + 6}
        y={h / 2 - 5}
        fontSize={10}
        fontFamily="DM Sans"
        fill="rgba(255,255,255,0.35)"
        rotation={0}
      />
    </Group>
  );
}
