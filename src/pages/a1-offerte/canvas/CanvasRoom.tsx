import React, { useRef } from 'react';
import { Line, Group } from 'react-konva';
import Konva from 'konva';
import { Room, RoomElement, getShapePoints, getShapeType } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { WallId, DraggingHandle } from './canvasTypes';
import { isNonRect, quadBounds, boundingSize, snapPosition } from './canvasUtils';
import RoomShape from './RoomShape';
import RoomDimensionLines from './RoomDimensionLines';
import RoomLabels from './RoomLabels';
import RoomElementsList from './RoomElements';
import RoomHandles from './RoomHandles';
import RoomGhost from './RoomGhost';

const GRAB_EDGE_RATIO = 0.22;

function getDragFromWalls(localX: number, localY: number, w: number, h: number): WallId[] {
  const walls: WallId[] = [];
  const cx = w / 2, cy = h / 2;
  if (localX <= -cx + w * GRAB_EDGE_RATIO) walls.push('left');
  if (localX >= cx - w * GRAB_EDGE_RATIO) walls.push('right');
  if (localY <= -cy + h * GRAB_EDGE_RATIO) walls.push('top');
  if (localY >= cy - h * GRAB_EDGE_RATIO) walls.push('bottom');
  return walls.length > 0 ? walls : ['left', 'right', 'top', 'bottom'];
}

interface CanvasRoomProps {
  room: Room;
  rooms: Room[];
  selectedRoomId: string | null;
  selectedElementId: string | null;
  placingElement: { type: RoomElement['type']; width: number; height: number } | null;
  ghostPos: { wall: WallId; position: number } | null;
  draggingHandle: DraggingHandle;
  cutRoomId?: string | null;
  canvasColors: CanvasColors;
  theme: string;
  activeDragWalls: WallId[] | null;
  onSelectRoom: (id: string | null) => void;
  onMoveRoom: (id: string, x: number, y: number) => void;
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
  onUpdateElement?: (roomId: string, elementId: string, updates: Partial<RoomElement>) => void;
  onPlaceElement?: (roomId: string, wall: WallId, position: number) => void;
  onSetSelectedElement: (id: string | null) => void;
  onSetDraggingHandle: (handle: DraggingHandle) => void;
  onSnapHighlight: (snap: { roomId: string; wall: 'top' | 'right' | 'bottom' | 'left' } | null) => void;
  onDragStartWalls: (roomId: string, walls: WallId[]) => void;
  onDragEndRoom: () => void;
}

export default function CanvasRoom({
  room,
  rooms,
  selectedRoomId,
  selectedElementId,
  placingElement,
  ghostPos,
  draggingHandle,
  cutRoomId,
  canvasColors,
  theme,
  onSelectRoom,
  onMoveRoom,
  onUpdateRoom,
  onUpdateElement,
  onPlaceElement,
  onSetSelectedElement,
  onSetDraggingHandle,
  onSnapHighlight,
  activeDragWalls,
  onDragStartWalls,
  onDragEndRoom,
}: CanvasRoomProps) {
  const snapHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizedStripeGreen = theme === 'dark' ? 'rgba(200, 255, 220, 0.28)' : 'rgba(134, 239, 172, 0.45)';
  const finalizedStripeLineWidth = theme === 'dark' ? 1.5 : 4;

  const shapeType = room.shapeType ?? getShapeType(room.shape);
  const nonRect = shapeType === 'rect' && isNonRect(room);
  const qb = nonRect ? quadBounds(room) : null;
  const { w, h } = boundingSize(room);
  const rot = room.rotation || 0;
  const cx = w / 2;
  const cy = h / 2;
  const isSelected = room.id === selectedRoomId;
  const area = shapeType === 'circle' ? Math.PI * (room.length / 2) ** 2 : shapeType === 'halfcircle' ? (Math.PI * (room.length / 2) ** 2) / 2 : room.length * room.width;
  const points = qb ? qb.pts : getShapePoints(room.shape, w, h);
  const showWallNumbers = shapeType === 'rect' || shapeType === 'plus' || shapeType === 'ruit';
  const isLooseSpecial = !room.isSubRoom && room.roomType !== 'normal';
  const subRoomCount = rooms.filter(r => r.parentRoomId === room.id).length;

  const stroke = room.isSubRoom
    ? (isSelected ? canvasColors.roomStrokeSelected : '#1A6BFF')
    : isLooseSpecial
      ? '#FF5C1A'
      : (isSelected ? canvasColors.roomStrokeSelected : canvasColors.roomStroke);
  const roomFill = room.isSubRoom ? '#0D1F2D' : canvasColors.roomFill;
  const strokeOpacity = room.isSubRoom && !isSelected ? 0.6 : isLooseSpecial ? 0.5 : 1;
  const dashPattern = isLooseSpecial ? [4, 4] : undefined;

  return (
    <Group
      key={room.id}
      x={room.x + cx}
      y={room.y + cy}
      offsetX={cx}
      offsetY={cy}
      rotation={rot}
      opacity={room.id === cutRoomId ? 0.4 : 1}
      draggable={!placingElement && !draggingHandle && !room.isFinalized}
      onDragStart={(e: Konva.KonvaEventObject<DragEvent>) => {
        const pos = e.target.getRelativePointerPosition();
        if (pos) {
          const walls = getDragFromWalls(pos.x, pos.y, w, h);
          onDragStartWalls(room.id, walls);
        }
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const newX = e.target.x() - cx;
        const newY = e.target.y() - cy;
        const snapped = snapPosition(room.id, newX, newY, rooms, activeDragWalls);
        e.target.x(snapped.x + cx);
        e.target.y(snapped.y + cy);
        onDragEndRoom();
        onMoveRoom(room.id, snapped.x, snapped.y);
        if (snapped.snappedToId && snapped.snappedWall && room.roomType !== 'normal') {
          onSnapHighlight({ roomId: snapped.snappedToId, wall: snapped.snappedWall });
          if (snapHighlightTimer.current) clearTimeout(snapHighlightTimer.current);
          snapHighlightTimer.current = setTimeout(() => onSnapHighlight(null), 1000);
        }
      }}
      onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
        if (placingElement && ghostPos) {
          e.cancelBubble = true;
          onPlaceElement?.(room.id, ghostPos.wall, ghostPos.position);
          return;
        }
        onSelectRoom(room.id);
      }}
      onTap={() => onSelectRoom(room.id)}
    >
      <RoomShape
        shapeType={shapeType}
        points={points}
        w={w}
        h={h}
        cx={cx}
        cy={cy}
        roomFill={roomFill}
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        dashPattern={dashPattern}
        isSelected={isSelected}
        room={room}
        isLooseSpecial={isLooseSpecial}
        finalizedStripeGreen={room.isFinalized ? finalizedStripeGreen : undefined}
        finalizedStripeLineWidth={room.isFinalized ? finalizedStripeLineWidth : undefined}
      />
      {activeDragWalls && activeDragWalls.length > 0 && (
        <Group listening={false}>
          {activeDragWalls.includes('left') && (
            <Line points={[0, 0, 0, h]} stroke={theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(255,180,80,0.85)'} strokeWidth={2.5} />
          )}
          {activeDragWalls.includes('right') && (
            <Line points={[w, 0, w, h]} stroke={theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(255,180,80,0.85)'} strokeWidth={2.5} />
          )}
          {activeDragWalls.includes('top') && (
            <Line points={[0, 0, w, 0]} stroke={theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(255,180,80,0.85)'} strokeWidth={2.5} />
          )}
          {activeDragWalls.includes('bottom') && (
            <Line points={[0, h, w, h]} stroke={theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(255,180,80,0.85)'} strokeWidth={2.5} />
          )}
        </Group>
      )}
      <RoomLabels
        room={room}
        rooms={rooms}
        w={w}
        h={h}
        cx={cx}
        cy={cy}
        rot={rot}
        area={area}
        isLooseSpecial={isLooseSpecial}
        subRoomCount={subRoomCount}
        showWallNumbers={showWallNumbers}
        canvasColors={canvasColors}
      />
      <RoomDimensionLines
        shapeType={shapeType}
        w={w}
        h={h}
        cx={cx}
        cy={cy}
        rot={rot}
        room={room}
        isSelected={isSelected}
        canvasColors={canvasColors}
      />
      <RoomElementsList
        room={room}
        w={w}
        h={h}
        selectedElementId={selectedElementId}
        canvasColors={canvasColors}
        onUpdateElement={onUpdateElement}
        onSetSelectedElement={onSetSelectedElement}
      />
      {isSelected && onUpdateRoom && !room.isFinalized && (shapeType === 'rect' || shapeType === 'plus' || shapeType === 'ruit') && !placingElement && (
        <RoomHandles
          room={room}
          w={w}
          h={h}
          shapeType={shapeType}
          draggingHandle={draggingHandle}
          placingElement={placingElement}
          canvasColors={canvasColors}
          onSetDraggingHandle={onSetDraggingHandle}
        />
      )}
      <RoomGhost
        isSelected={isSelected}
        placingElement={placingElement}
        ghostPos={ghostPos}
        w={w}
        h={h}
      />
    </Group>
  );
}
