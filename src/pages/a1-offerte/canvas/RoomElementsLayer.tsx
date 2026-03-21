import React from 'react';
import { Group, Rect } from 'react-konva';
import Konva from 'konva';
import { Room, RoomElement } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { PX_PER_M } from './canvasTypes';
import { clamp } from './canvasGeometry';
import { renderElementContent } from './renderElementContent';

interface RoomElementsListProps {
  room: Room;
  w: number;
  h: number;
  selectedElementId: string | null;
  canvasColors: CanvasColors;
  onUpdateElement?: (roomId: string, elementId: string, updates: Partial<RoomElement>) => void;
  onSetSelectedElement: (id: string | null) => void;
}

export default function RoomElementsList({
  room,
  w,
  h,
  selectedElementId,
  canvasColors,
  onUpdateElement,
  onSetSelectedElement,
}: RoomElementsListProps) {
  return (
    <>
      {room.elements.map((el) => {
        const elW = el.width * PX_PER_M;
        const isDoor = el.type === 'deur' || el.type === 'schuifdeur';
        const isWindow = el.type === 'raam';
        const thickness = isDoor ? 8 : isWindow ? 6 : 8;
        const pos = clamp(el.position, 0.05, 0.95);
        let ex = 0, ey = 0;

        switch (el.wall) {
          case 'top': ex = w * pos - elW / 2; ey = 0; break;
          case 'right': ex = w - thickness; ey = h * pos - elW / 2; break;
          case 'bottom': ex = w * pos - elW / 2; ey = h - thickness; break;
          case 'left': ex = 0; ey = h * pos - elW / 2; break;
        }

        const elH = el.height * PX_PER_M;

        const dragBoundFunc = (dragPos: { x: number; y: number }) => {
          if (el.wall === 'top' || el.wall === 'bottom') {
            const fixedY = el.wall === 'top' ? 0 : h - thickness;
            return { x: Math.max(0, Math.min(w - elW, dragPos.x)), y: fixedY };
          } else {
            const fixedX = el.wall === 'left' ? 0 : w - thickness;
            return { x: fixedX, y: Math.max(0, Math.min(h - elH, dragPos.y)) };
          }
        };

        const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
          const node = e.target;
          let newPos: number;
          if (el.wall === 'top' || el.wall === 'bottom') {
            newPos = (node.x() + elW / 2) / w;
          } else {
            newPos = (node.y() + elH / 2) / h;
          }
          newPos = clamp(newPos, 0.05, 0.95);
          onUpdateElement?.(room.id, el.id, { wall: el.wall, position: newPos });
        };

        const isElSelected = el.id === selectedElementId;
        const isHoriz = el.wall === 'top' || el.wall === 'bottom';
        const bw = isHoriz ? elW : thickness;
        const bh = isHoriz ? thickness : elW;

        return (
          <Group
            key={el.id}
            x={ex}
            y={ey}
            draggable={!!onUpdateElement && !room.isFinalized}
            dragBoundFunc={dragBoundFunc}
            onDragEnd={handleDragEnd}
            onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
              e.cancelBubble = true;
              onSetSelectedElement(el.id);
            }}
          >
            {renderElementContent(el.type, el.wall, elW)}
            <Rect
              x={0} y={0}
              width={bw} height={bh}
              fill="transparent"
              stroke={isElSelected ? '#FF5C1A' : canvasColors.elementStrokeUnselected}
              strokeWidth={isElSelected ? 2 : 1}
            />
            {isElSelected && (
              <>
                <Rect x={-3} y={-3} width={6} height={6} fill="#FF5C1A" />
                <Rect x={bw - 3} y={-3} width={6} height={6} fill="#FF5C1A" />
                <Rect x={-3} y={bh - 3} width={6} height={6} fill="#FF5C1A" />
                <Rect x={bw - 3} y={bh - 3} width={6} height={6} fill="#FF5C1A" />
              </>
            )}
          </Group>
        );
      })}
    </>
  );
}
