import React, { useRef } from 'react';
import { Line, Circle, Group, Rect } from 'react-konva';
import Konva from 'konva';
import { Room, RoomElement, getShapePoints, getShapeType, ensureVertices, verticesToPoints } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { WallId, DraggingHandle, PX_PER_M } from './canvasTypes';
import { isNonRect, quadBounds, boundingSize, snapPosition } from './canvasUtils';
import RoomShape from './RoomShape';
import RoomDimensionLines from './RoomDimensionLines';
import RoomLabels from './RoomLabels';
import RoomElementsList from './RoomElements';
import RoomHandles from './RoomHandles';
import RoomGhost from './RoomGhost';

/** Centre zone: if pointer is this far from all edges (from centre), treat as whole-room grab. */
const CENTER_ZONE_RATIO = 0.25;

/**
 * Which wall(s) the user is grabbing, from room content space (0,0)-(w,h) top-left origin.
 * Uses distance to each edge; if pointer is in the centre zone, returns all four walls.
 */
function getDragFromWalls(localX: number, localY: number, w: number, h: number): WallId[] {
  const dLeft = localX;
  const dRight = w - localX;
  const dTop = localY;
  const dBottom = h - localY;
  const centerZone = CENTER_ZONE_RATIO * Math.min(w, h) / 2;
  const minDist = Math.min(dLeft, dRight, dTop, dBottom);
  if (minDist >= centerZone) {
    return ['left', 'right', 'top', 'bottom'];
  }
  if (dLeft <= dRight && dLeft <= dTop && dLeft <= dBottom) return ['left'];
  if (dRight <= dTop && dRight <= dBottom) return ['right'];
  if (dTop <= dBottom) return ['top'];
  return ['bottom'];
}

interface CanvasRoomProps {
  room: Room;
  rooms: Room[];
  selectedRoomId: string | null;
  selectedElementId: string | null;
  placingElement: { type: RoomElement['type']; width: number; height: number } | null;
  ghostPos: { wall: WallId; position: number } | null;
  draggingHandle: DraggingHandle;
  isDraggingVertex?: boolean;
  cutRoomId?: string | null;
  canvasColors: CanvasColors;
  theme: string;
  activeDragWalls: WallId[] | null;
  selectedWallIndices?: number[];
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
  onVertexHandleMouseDown?: (vertexIndex: number, worldX: number, worldY: number) => void;
  isMultiSelected?: boolean;
  multiDragOffset?: { dx: number; dy: number } | null;
  selectionModifierHeld?: boolean;
  onRoomClick?: (roomId: string, evt: MouseEvent) => void;
  onRoomDragMove?: (roomId: string, dx: number, dy: number) => void;
}

export default function CanvasRoom({
  room,
  rooms,
  selectedRoomId,
  selectedElementId,
  placingElement,
  ghostPos,
  draggingHandle,
  isDraggingVertex,
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
  selectedWallIndices,
  onDragStartWalls,
  onDragEndRoom,
  onVertexHandleMouseDown,
  isMultiSelected,
  multiDragOffset,
  selectionModifierHeld,
  onRoomClick,
  onRoomDragMove,
}: CanvasRoomProps) {
  const snapHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizedStripeGreen = theme === 'dark' ? 'rgba(200, 255, 220, 0.28)' : 'rgba(134, 239, 172, 0.45)';
  const finalizedStripeLineWidth = theme === 'dark' ? 1.5 : 4;
  const finalizedSolidGreen = theme === 'dark' ? 'rgba(134, 239, 172, 0.15)' : 'rgba(134, 239, 172, 0.25)';

  const shapeType = room.shapeType ?? getShapeType(room.shape);
  const hasVertices = (room.vertices?.length ?? 0) >= 3 && shapeType !== 'circle' && shapeType !== 'halfcircle';
  const nonRect = shapeType === 'rect' && !hasVertices && isNonRect(room);
  const qb = nonRect ? quadBounds(room) : null;
  const { w, h } = boundingSize(room);
  const rot = room.rotation || 0;
  const cx = w / 2;
  const cy = h / 2;
  const isSelected = room.id === selectedRoomId;
  const area = shapeType === 'circle' ? Math.PI * (room.length / 2) ** 2 : shapeType === 'halfcircle' ? (Math.PI * (room.length / 2) ** 2) / 2 : room.length * room.width;
  const points = hasVertices
    ? verticesToPoints(ensureVertices(room))
    : qb ? qb.pts : getShapePoints(room.shape, w, h);
  const isLooseSpecial = !room.isSubRoom && room.roomType !== 'normal';
  const isSpecialRoom = room.roomType !== 'normal';
  const showWallNumbers = shapeType !== 'circle' && shapeType !== 'halfcircle' && !isSpecialRoom;
  const subRoomCount = rooms.filter(r => r.parentRoomId === room.id).length;

  const stroke = room.isSubRoom
    ? (isSelected ? canvasColors.roomStrokeSelected : canvasColors.subRoomStroke)
    : isLooseSpecial
      ? '#FF5C1A'
      : (isSelected ? canvasColors.roomStrokeSelected : canvasColors.roomStroke);
  const roomFill = room.isSubRoom ? canvasColors.subRoomFill : canvasColors.roomFill;
  const strokeOpacity = room.isSubRoom && !isSelected ? 0.6 : isLooseSpecial ? 0.5 : 1;
  const dashPattern = isLooseSpecial ? [4, 4] : undefined;

  return (
    <Group
      key={room.id}
      x={room.x + cx + (multiDragOffset?.dx ?? 0)}
      y={room.y + cy + (multiDragOffset?.dy ?? 0)}
      offsetX={cx}
      offsetY={cy}
      rotation={rot}
      opacity={room.id === cutRoomId ? 0.4 : 1}
      draggable={!placingElement && !draggingHandle && !isDraggingVertex && !room.isFinalized && !selectionModifierHeld}
      onDragStart={(e: Konva.KonvaEventObject<DragEvent>) => {
        const pos = e.target.getRelativePointerPosition();
        if (pos) {
          const walls = getDragFromWalls(pos.x, pos.y, w, h);
          onDragStartWalls(room.id, walls);
        }
      }}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        if (isMultiSelected && onRoomDragMove) {
          onRoomDragMove(room.id, e.target.x() - cx - room.x, e.target.y() - cy - room.y);
        }
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const newX = e.target.x() - cx;
        const newY = e.target.y() - cy;
        const snapped = snapPosition(room.id, newX, newY, rooms, activeDragWalls);
        // #region agent log
        fetch('http://127.0.0.1:7644/ingest/073d4520-a64b-4ad6-8bfd-6e2322419c20',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'379215'},body:JSON.stringify({sessionId:'379215',location:'CanvasRoom.tsx:onDragEnd',message:'snap during room drag',data:{roomId:room.id,rawX:newX,rawY:newY,snappedX:snapped.x,snappedY:snapped.y,snappedToId:snapped.snappedToId,snappedWall:snapped.snappedWall,activeDragWalls,deltaX:snapped.x-newX,deltaY:snapped.y-newY,otherRoomCount:rooms.filter(r=>r.id!==room.id).length},timestamp:Date.now(),hypothesisId:'A-B'})}).catch(()=>{});
        // #endregion
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
        if (onRoomClick && (e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey)) {
          e.cancelBubble = true;
          onRoomClick(room.id, e.evt);
        } else {
          onSelectRoom(room.id);
        }
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
        finalizedSolidGreen={room.isFinalized ? finalizedSolidGreen : undefined}
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
      {isMultiSelected && (
        <Rect
          x={-4}
          y={-4}
          width={w + 8}
          height={h + 8}
          stroke="#3B82F6"
          strokeWidth={1.5}
          dash={[6, 4]}
          listening={false}
          cornerRadius={3}
        />
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
        isSelected={isSelected}
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
        isDraggingHandle={draggingHandle?.roomId === room.id}
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
      {isSelected && onUpdateRoom && !room.isFinalized && !placingElement && (
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

      {/* Selected-wall highlights and vertex drag handles */}
      {isSelected && hasVertices && selectedWallIndices && selectedWallIndices.length > 0 && (() => {
        const verts = ensureVertices(room);
        const n = verts.length;

        const handleVertexIndices = new Set<number>();
        selectedWallIndices.forEach(wi => {
          if (wi < n) handleVertexIndices.add((wi + 1) % n);
        });

        const centroidX = verts.reduce((s, v) => s + v.x, 0) / n * PX_PER_M;
        const centroidY = verts.reduce((s, v) => s + v.y, 0) / n * PX_PER_M;
        const HANDLE_OUTWARD_OFFSET = 14;

        return (
          <Group>
            {selectedWallIndices.map(wi => {
              if (wi >= n) return null;
              const v1 = verts[wi];
              const v2 = verts[(wi + 1) % n];
              return (
                <Line
                  key={`wall-hl-${wi}`}
                  points={[v1.x * PX_PER_M, v1.y * PX_PER_M, v2.x * PX_PER_M, v2.y * PX_PER_M]}
                  stroke="#3B82F6"
                  strokeWidth={3}
                  listening={false}
                />
              );
            })}
            {!room.isFinalized && !placingElement && onVertexHandleMouseDown &&
              Array.from(handleVertexIndices).map(vi => {
                const v = verts[vi];
                const vxPx = v.x * PX_PER_M;
                const vyPx = v.y * PX_PER_M;
                const dx = vxPx - centroidX;
                const dy = vyPx - centroidY;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const offsetX = vxPx + (dx / dist) * HANDLE_OUTWARD_OFFSET;
                const offsetY = vyPx + (dy / dist) * HANDLE_OUTWARD_OFFSET;
                return (
                  <Circle
                    key={`vhandle-${vi}`}
                    x={offsetX}
                    y={offsetY}
                    radius={6}
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth={1.5}
                    listening={true}
                    onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'crosshair';
                      e.target.to({ radius: 9, strokeWidth: 2.5, duration: 0.1 });
                    }}
                    onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = '';
                      e.target.to({ radius: 6, strokeWidth: 1.5, duration: 0.1 });
                    }}
                    onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      if (!stage) return;
                      const pointer = stage.getPointerPosition();
                      if (!pointer) return;
                      const worldX = (pointer.x - stage.x()) / stage.scaleX();
                      const worldY = (pointer.y - stage.y()) / stage.scaleY();
                      onVertexHandleMouseDown(vi, worldX, worldY);
                    }}
                  />
                );
              })
            }
          </Group>
        );
      })()}
    </Group>
  );
}
