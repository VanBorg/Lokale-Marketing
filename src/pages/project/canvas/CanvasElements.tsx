import { Group, Line, Rect } from 'react-konva';
import type { SubRoom } from '../../../lib/database.types';

const SCALE = 80;

interface CanvasElementsProps {
  subRooms: SubRoom[];
  parentX: number;
  parentY: number;
}

export default function CanvasElements({ subRooms, parentX, parentY }: CanvasElementsProps) {
  return (
    <Group>
      {subRooms.map((sub, i) => {
        const sx = parentX + sub.x * SCALE;
        const sy = parentY + sub.y * SCALE;
        const sw = sub.width * SCALE;
        const sh = sub.height * SCALE;

        if (sub.type === 'deur' || sub.type === 'raam') {
          return (
            <Group key={i}>
              <Line
                points={[sx, sy, sx + sw, sy]}
                stroke={sub.type === 'deur' ? '#22C55E' : '#35B4D3'}
                strokeWidth={3}
                lineCap="round"
              />
            </Group>
          );
        }

        return (
          <Rect
            key={i}
            x={sx}
            y={sy}
            width={sw}
            height={sh}
            fill="rgba(53, 180, 211, 0.08)"
            stroke="rgba(53, 180, 211, 0.3)"
            strokeWidth={1}
            dash={[4, 4]}
            cornerRadius={2}
          />
        );
      })}
    </Group>
  );
}
