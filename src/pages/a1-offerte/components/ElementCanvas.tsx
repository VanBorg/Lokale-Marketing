import React from 'react';
import { Stage as KonvaStage, Layer, Line, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { Room, RoomElement, getShapePoints, getRoomFillKey } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { WallId, PX_PER_M } from '../canvas/canvasTypes';
import { clamp } from '../canvas/canvasGeometry';
import { renderElementContent } from '../canvas/renderElementContent';

const Stage = KonvaStage as unknown as React.ComponentType<any>;

const WALL_LABELS: Record<WallId, string> = { top: 'Boven', right: 'Rechts', bottom: 'Onder', left: 'Links' };

interface ElementCanvasProps {
  room: Room;
  canvasSize: { width: number; height: number };
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (roomId: string, elementId: string, updates: Partial<RoomElement>) => void;
  canvasColors: CanvasColors;
}

export default function ElementCanvas({
  room,
  canvasSize,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  canvasColors,
}: ElementCanvasProps) {
  const roomW = room.length * PX_PER_M;
  const roomH = room.width * PX_PER_M;

  const padding = 60;
  const scaleX = roomW > 0 ? (canvasSize.width - padding * 2) / roomW : 1;
  const scaleY = roomH > 0 ? (canvasSize.height - padding * 2) / roomH : 1;
  const canvasScale = Math.min(scaleX, scaleY, 3) * 0.8;
  const offsetX = (canvasSize.width - roomW * canvasScale) / 2;
  const offsetY = (canvasSize.height - roomH * canvasScale) / 2;

  return (
    <Stage width={canvasSize.width} height={canvasSize.height}>
      <Layer>
        <Group x={offsetX} y={offsetY} scaleX={canvasScale} scaleY={canvasScale}>
          <Line
            points={getShapePoints(room.shape, roomW, roomH)}
            closed
            fill={canvasColors[getRoomFillKey(room)]}
            stroke={canvasColors.roomStrokeSelected}
            strokeWidth={2 / canvasScale}
          />
          <>
            <Text text="1" x={roomW / 2 - 4} y={4} fontSize={12 / canvasScale} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
            <Text text="2" x={roomW - 16 / canvasScale} y={roomH / 2 - 6} fontSize={12 / canvasScale} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
            <Text text="3" x={roomW / 2 - 4} y={roomH - 16 / canvasScale} fontSize={12 / canvasScale} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
            <Text text="4" x={4} y={roomH / 2 - 6} fontSize={12 / canvasScale} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
          </>

          {room.elements.map((el) => {
            const elW = el.width * PX_PER_M;
            const isDoor = el.type === 'deur' || el.type === 'schuifdeur';
            const isWindow = el.type === 'raam';
            const thickness = isDoor ? 8 : isWindow ? 6 : 8;
            const pos = clamp(el.position, 0.05, 0.95);
            let ex = 0, ey = 0;

            switch (el.wall) {
              case 'top': ex = roomW * pos - elW / 2; ey = 0; break;
              case 'right': ex = roomW - thickness; ey = roomH * pos - elW / 2; break;
              case 'bottom': ex = roomW * pos - elW / 2; ey = roomH - thickness; break;
              case 'left': ex = 0; ey = roomH * pos - elW / 2; break;
            }

            const elH = el.height * PX_PER_M;
            const isHoriz = el.wall === 'top' || el.wall === 'bottom';
            const bw = isHoriz ? elW : thickness;
            const bh = isHoriz ? thickness : elW;
            const isElSelected = el.id === selectedElementId;

            const dragBoundFunc = (dragPos: { x: number; y: number }) => {
              const localX = (dragPos.x - offsetX) / canvasScale;
              const localY = (dragPos.y - offsetY) / canvasScale;
              if (el.wall === 'top' || el.wall === 'bottom') {
                const fixedY = el.wall === 'top' ? 0 : roomH - thickness;
                const clampedX = Math.max(0, Math.min(roomW - elW, localX));
                return { x: clampedX * canvasScale + offsetX, y: fixedY * canvasScale + offsetY };
              } else {
                const fixedX = el.wall === 'left' ? 0 : roomW - thickness;
                const clampedY = Math.max(0, Math.min(roomH - elH, localY));
                return { x: fixedX * canvasScale + offsetX, y: clampedY * canvasScale + offsetY };
              }
            };

            const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
              const node = e.target;
              const localX = (node.x() - offsetX) / canvasScale;
              const localY = (node.y() - offsetY) / canvasScale;
              let newPos: number;
              if (el.wall === 'top' || el.wall === 'bottom') {
                newPos = (localX + elW / 2) / roomW;
              } else {
                newPos = (localY + elH / 2) / roomH;
              }
              newPos = clamp(newPos, 0.05, 0.95);
              onUpdateElement(room.id, el.id, { position: newPos });
              node.x(ex * canvasScale + offsetX);
              node.y(ey * canvasScale + offsetY);
            };

            return (
              <Group
                key={el.id}
                x={ex}
                y={ey}
                draggable
                dragBoundFunc={dragBoundFunc}
                onDragEnd={handleDragEnd}
                onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                  e.cancelBubble = true;
                  onSelectElement(el.id);
                }}
              >
                {renderElementContent(el.type, el.wall, elW)}
                <Rect x={0} y={0} width={bw} height={bh} fill="transparent" stroke={isElSelected ? '#FF5C1A' : canvasColors.elementStrokeUnselected} strokeWidth={isElSelected ? 2 : 1} />
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
        </Group>
      </Layer>
    </Stage>
  );
}

export { WALL_LABELS };
