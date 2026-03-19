import React from 'react';
import { Circle } from 'react-konva';
import Konva from 'konva';
import { Room } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { HandleType, HANDLE_CURSORS, DraggingHandle } from './canvasTypes';
import { rotatedResizeCursor } from './canvasGeometry';

interface RoomHandlesProps {
  room: Room;
  w: number;
  h: number;
  shapeType: NonNullable<Room['shapeType']>;
  draggingHandle: DraggingHandle;
  placingElement: { type: string; width: number; height: number } | null;
  canvasColors: CanvasColors;
  onSetDraggingHandle: (handle: DraggingHandle) => void;
}

export default function RoomHandles({
  room,
  w,
  h,
  shapeType,
  draggingHandle,
  placingElement,
  canvasColors,
  onSetDraggingHandle,
}: RoomHandlesProps) {
  const rotationDeg = room.rotation ?? 0;
  const handleSize = 5;
  const handles: { type: HandleType; x: number; y: number }[] = [
    { type: 'nw', x: 0, y: 0 },
    { type: 'n', x: w / 2, y: 0 },
    { type: 'ne', x: w, y: 0 },
    { type: 'e', x: w, y: h / 2 },
    { type: 'se', x: w, y: h },
    { type: 's', x: w / 2, y: h },
    { type: 'sw', x: 0, y: h },
    { type: 'w', x: 0, y: h / 2 },
  ];
  return (
    <>
      {handles.map(hp => (
        <Circle
          key={hp.type}
          x={hp.x}
          y={hp.y}
          radius={handleSize}
          fill="#FF5C1A"
          stroke={canvasColors.handleStroke}
          strokeWidth={1}
          onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
            e.cancelBubble = true;
            const parent = e.target.getParent();
            if (parent) parent.draggable(false);
            const stage = e.target.getStage();
            if (!stage) return;
            const pos = stage.getPointerPosition();
            if (!pos) return;
            const wx = (pos.x - stage.x()) / stage.scaleX();
            const wy = (pos.y - stage.y()) / stage.scaleY();
            onSetDraggingHandle({
              roomId: room.id,
              handle: hp.type,
              startWorldPos: { x: wx, y: wy },
              startRoom: { ...room },
            });
          }}
          onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
            const stage = e.target.getStage();
            if (stage) {
              const container = stage.container();
              const base = HANDLE_CURSORS[hp.type];
              container.style.cursor = rotatedResizeCursor(base, rotationDeg);
            }
          }}
          onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
            if (draggingHandle) return;
            const stage = e.target.getStage();
            if (stage) {
              const container = stage.container();
              container.style.cursor = 'grab';
            }
          }}
        />
      ))}
    </>
  );
}
