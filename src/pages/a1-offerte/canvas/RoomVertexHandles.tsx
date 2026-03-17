import React from 'react';
import { Circle, Text, Group } from 'react-konva';
import Konva from 'konva';
import { Room, Vertex, ensureVertices, insertVertex } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { DraggingVertex, PX_PER_M } from './canvasTypes';

interface RoomVertexHandlesProps {
  room: Room;
  draggingVertex: DraggingVertex;
  canvasColors: CanvasColors;
  onSetDraggingVertex: (dv: DraggingVertex) => void;
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
}

export default function RoomVertexHandles({
  room,
  draggingVertex,
  canvasColors,
  onSetDraggingVertex,
  onUpdateRoom,
}: RoomVertexHandlesProps) {
  const verts = ensureVertices(room);
  const vertexRadius = 5;
  const addRadius = 4;

  return (
    <>
      {verts.map((v, i) => (
        <Circle
          key={`v-${i}`}
          x={v.x * PX_PER_M}
          y={v.y * PX_PER_M}
          radius={vertexRadius}
          fill="#FF5C1A"
          stroke={canvasColors.handleStroke}
          strokeWidth={1}
          onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
            e.cancelBubble = true;
            const stage = e.target.getStage();
            if (!stage) return;
            const pos = stage.getPointerPosition();
            if (!pos) return;
            const wx = (pos.x - stage.x()) / stage.scaleX();
            const wy = (pos.y - stage.y()) / stage.scaleY();
            onSetDraggingVertex({
              roomId: room.id,
              vertexIndex: i,
              startWorldPos: { x: wx, y: wy },
              startVertices: verts.map(sv => ({ ...sv })),
              startRoomPos: { x: room.x, y: room.y },
              startRotation: room.rotation || 0,
            });
          }}
          onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'move';
          }}
          onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
            if (draggingVertex) return;
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'grab';
          }}
        />
      ))}

      {onUpdateRoom && verts.map((v, i) => {
        const next = verts[(i + 1) % verts.length];
        const mx = ((v.x + next.x) / 2) * PX_PER_M;
        const my = ((v.y + next.y) / 2) * PX_PER_M;
        return (
          <Group
            key={`add-${i}`}
            x={mx}
            y={my}
            onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
              e.cancelBubble = true;
              const newVerts = insertVertex(verts, i);
              const newLocks = room.wallLocks
                ? [...room.wallLocks.slice(0, i + 1), false, ...room.wallLocks.slice(i + 1)]
                : undefined;
              onUpdateRoom(room.id, { vertices: newVerts, wallLocks: newLocks });
            }}
            onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'grab';
            }}
          >
            <Circle
              radius={addRadius}
              fill={canvasColors.dimensionLabelBg}
              stroke="#FF5C1A"
              strokeWidth={1}
              opacity={0.7}
            />
            <Text
              text="+"
              x={-3}
              y={-4.5}
              fontSize={9}
              fill="#FF5C1A"
              fontFamily="DM Sans, sans-serif"
              fontStyle="bold"
              listening={false}
            />
          </Group>
        );
      })}
    </>
  );
}
