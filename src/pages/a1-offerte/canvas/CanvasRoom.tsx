import React, { useRef } from 'react';
import { Line, Circle, Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { Room, RoomElement, getShapePoints, getShapeType, ensureVertices, verticesToPoints, isSpecialRoom, getRoomFillKey } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { WallId, DraggingHandle, PX_PER_M, SnapResult } from './canvasTypes';
import { isNonRect, quadBounds, boundingSize } from './canvasGeometry';
import { snapPosition } from './canvasSnapping';
import { snapPositionBySegment } from './canvasSegmentSnap';
import { snapSpecialRoomToWall } from './canvasWallSnap';
import { getSpecialRoomConfig } from '../specialRooms/index';
import { wallMidDragCursor, rotatedResizeCursor, getRoomLabelCentreLocalPx } from './canvasGeometry';
import RoomShape from './RoomShape';
import RoomDimensionLines from './RoomDimensionLines';
import RoomLabels from './RoomLabels';
import RoomElementsList from './RoomElementsLayer';
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

function getNearestWall(localX: number, localY: number, w: number, h: number): WallId[] {
  const dLeft = localX;
  const dRight = w - localX;
  const dTop = localY;
  const dBottom = h - localY;
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
  isDraggingWall?: boolean;
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
  onSnapHighlight: (snap: { roomId: string; wall: string } | null) => void;
  onDragStartWalls: (roomId: string, walls: WallId[]) => void;
  onDragEndRoom: () => void;
  onVertexHandleMouseDown?: (vertexIndex: number, worldX: number, worldY: number) => void;
  onWallHandleMouseDown?: (wallIndex: number, worldX: number, worldY: number) => void;
  isMultiSelected?: boolean;
  multiDragOffset?: { dx: number; dy: number } | null;
  selectionModifierHeld?: boolean;
  onRoomClick?: (roomId: string, evt: MouseEvent) => void;
  onRoomDragMove?: (roomId: string, dx: number, dy: number) => void;
  /** Called during drag with screen pointer and current room top-left in world so parent can run edge-based auto-pan and keep room under cursor. */
  onRoomDragMovePosition?: (pointerX: number, pointerY: number, roomWorldX: number, roomWorldY: number) => void;
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
  isDraggingWall,
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
  onWallHandleMouseDown,
  isMultiSelected,
  multiDragOffset,
  selectionModifierHeld,
  onRoomClick,
  onRoomDragMove,
  onRoomDragMovePosition,
}: CanvasRoomProps) {
  const snapHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shapeType = room.shapeType ?? getShapeType(room.shape);
  const hasVertices = (room.vertices?.length ?? 0) >= 3;
  const nonRect = shapeType === 'rect' && !hasVertices && isNonRect(room);
  const qb = nonRect ? quadBounds(room) : null;
  const { w, h } = boundingSize(room);
  const rot = room.rotation || 0;
  const cx = w / 2;
  const cy = h / 2;
  const { cx: labelCx, cy: labelCy } = getRoomLabelCentreLocalPx(room, w, h);
  const isSelected = room.id === selectedRoomId;
  const area = room.effectiveArea ?? room.length * room.width;
  const points = hasVertices
    ? verticesToPoints(ensureVertices(room))
    : qb ? qb.pts : getShapePoints(room.shape, w, h);
  const specialRoom = isSpecialRoom(room);
  const isLooseSpecial = !room.isSubRoom && specialRoom;
  const showWallNumbers = !specialRoom;
  const subRoomCount = rooms.filter(r => r.parentRoomId === room.id).length;

  const stroke = isSelected ? canvasColors.roomStrokeSelected : canvasColors.roomStroke;
  const roomFill = canvasColors[getRoomFillKey(room)];
  const strokeOpacity = 1;
  const dashPattern = undefined;

  return (
    <Group
      key={room.id}
      x={room.x + cx + (multiDragOffset?.dx ?? 0)}
      y={room.y + cy + (multiDragOffset?.dy ?? 0)}
      offsetX={cx}
      offsetY={cy}
      rotation={rot}
      opacity={room.id === cutRoomId ? 0.4 : 1}
      draggable={!placingElement && !draggingHandle && !isDraggingVertex && !isDraggingWall && !room.isFinalized && !selectionModifierHeld}
      onDragStart={(e: Konva.KonvaEventObject<DragEvent>) => {
        const pos = e.target.getRelativePointerPosition();
        if (pos) {
          // Special rooms must always snap on ALL axes simultaneously so the
          // Wall A / Wall B corner snap works regardless of drag direction.
          const walls: WallId[] = room.roomType !== 'normal'
            ? ['left', 'right', 'top', 'bottom']
            : getDragFromWalls(pos.x, pos.y, w, h);
          onDragStartWalls(room.id, walls);
        }
      }}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        if (room.roomType !== 'normal' && room.specialRoomPlacementMode === 'against-wall' && room.parentRoomId) {
          const parent = rooms.find(r => r.id === room.parentRoomId && r.roomType === 'normal');
          if (parent) {
            const rot = room.rotation || 0;
            const rw = (rot === 90 || rot === 270 ? room.width : room.length) * PX_PER_M;
            const rh = (rot === 90 || rot === 270 ? room.length : room.width) * PX_PER_M;
            const bleed = 8;
            const worldX = e.target.x() - cx;
            const worldY = e.target.y() - cy;
            const minX = parent.x - bleed;
            const minY = parent.y - bleed;
            const maxX = parent.x + parent.length * PX_PER_M + bleed - rw;
            const maxY = parent.y + parent.width * PX_PER_M + bleed - rh;
            const outsideDist = Math.max(
              minX - worldX,
              worldX - maxX,
              minY - worldY,
              worldY - maxY,
              0,
            );
            const releaseDist = 64;
            const shouldClamp = outsideDist <= releaseDist;
            if (shouldClamp) {
              let targetX = Math.max(minX, Math.min(maxX, worldX));
              let targetY = Math.max(minY, Math.min(maxY, worldY));
              const parentCorners = [
                { x: minX, y: minY },
                { x: maxX + rw, y: minY },
                { x: minX, y: maxY + rh },
                { x: maxX + rw, y: maxY + rh },
              ];
              const dragCornerCandidates = [
                { dx: 0, dy: 0, tx: (corner: { x: number; y: number }) => ({ x: corner.x, y: corner.y }) },
                { dx: rw, dy: 0, tx: (corner: { x: number; y: number }) => ({ x: corner.x - rw, y: corner.y }) },
                { dx: 0, dy: rh, tx: (corner: { x: number; y: number }) => ({ x: corner.x, y: corner.y - rh }) },
                { dx: rw, dy: rh, tx: (corner: { x: number; y: number }) => ({ x: corner.x - rw, y: corner.y - rh }) },
              ];
              let bestCornerDist = Infinity;
              let cornerSnapX = targetX;
              let cornerSnapY = targetY;
              for (const pc of parentCorners) {
                for (const dc of dragCornerCandidates) {
                  const cx0 = targetX + dc.dx;
                  const cy0 = targetY + dc.dy;
                  const d = Math.hypot(pc.x - cx0, pc.y - cy0);
                  if (d < bestCornerDist) {
                    bestCornerDist = d;
                    const snapped = dc.tx(pc);
                    cornerSnapX = snapped.x;
                    cornerSnapY = snapped.y;
                  }
                }
              }
              const cornerMagnetDist = 34;
              const useCornerMagnet = bestCornerDist <= cornerMagnetDist;
              if (useCornerMagnet) {
                targetX = Math.max(minX, Math.min(maxX, cornerSnapX));
                targetY = Math.max(minY, Math.min(maxY, cornerSnapY));
              }
              if (targetX !== worldX || targetY !== worldY) {
                e.target.x(targetX + cx);
                e.target.y(targetY + cy);
              }
            }
          }
        }
        if (isMultiSelected && onRoomDragMove) {
          onRoomDragMove(room.id, e.target.x() - cx - room.x, e.target.y() - cy - room.y);
        }
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (pointer && onRoomDragMovePosition) {
          const worldX = e.target.x() - cx;
          const worldY = e.target.y() - cy;
          onRoomDragMovePosition(pointer.x, pointer.y, worldX, worldY);
        }
      }}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
          const newX = e.target.x() - cx;
          const newY = e.target.y() - cy;

          let finalX: number;
          let finalY: number;
          let finalRot = room.rotation ?? 0;
          let snapForHighlight: SnapResult | null = null;

          const useSpecialWallPipeline =
            room.roomType !== 'normal'
            && !isMultiSelected
            && onUpdateRoom
            && !room.isFinalized;

          if (!useSpecialWallPipeline) {
            const snapped = snapPosition(room.id, newX, newY, rooms, activeDragWalls);
            finalX = snapped.x;
            finalY = snapped.y;
            snapForHighlight = snapped;
          } else {
            // 1) Rotation + flush tegen hostwand (dit maakte speciale kamers “plakkerig”).
            const wallSnap = snapSpecialRoomToWall({ ...room, x: newX, y: newY }, rooms);
            if (wallSnap) {
              finalRot = wallSnap.rotation;
              const roomsWithWallSnap = rooms.map(r =>
                r.id === room.id
                  ? { ...r, x: wallSnap.x, y: wallSnap.y, rotation: wallSnap.rotation }
                  : r,
              );
              // 2) Segment-snap met dezelfde rotatie/positie in de lijst, zodat je langs de wand kunt schuiven / tweede wand pakt.
              const snapConfig = getSpecialRoomConfig(room.roomType);
              const refined = snapPositionBySegment(
                room.id, wallSnap.x, wallSnap.y, roomsWithWallSnap,
                snapConfig?.preferredAttachmentWallIndex, activeDragWalls,
              );
              finalX = refined.x;
              finalY = refined.y;
              snapForHighlight = refined;
            } else {
              const snapConfig = getSpecialRoomConfig(room.roomType);
              const snapped = snapPositionBySegment(
                room.id, newX, newY, rooms,
                snapConfig?.preferredAttachmentWallIndex, activeDragWalls,
              );
              finalX = snapped.x;
              finalY = snapped.y;
              snapForHighlight = snapped;
            }
          }

          const { w: outW, h: outH } = boundingSize({ ...room, rotation: finalRot });
          const outCx = outW / 2;
          const outCy = outH / 2;
          e.target.x(finalX + outCx);
          e.target.y(finalY + outCy);
          onDragEndRoom();

          const rotationChanged = Math.abs(finalRot - (room.rotation ?? 0)) > 0.01;
          if (room.roomType !== 'normal' && onUpdateRoom && rotationChanged) {
            onUpdateRoom(room.id, { x: finalX, y: finalY, rotation: finalRot });
          } else {
            onMoveRoom(room.id, finalX, finalY);
          }
          if (snapForHighlight?.snappedToId && snapForHighlight?.snappedWall && room.roomType !== 'normal') {
            onSnapHighlight({ roomId: snapForHighlight.snappedToId, wall: snapForHighlight.snappedWall });
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
        isSpecialRoom={specialRoom}
        finalizedRoomStripe={room.isFinalized && !specialRoom ? canvasColors.finalizedRoomStripe : undefined}
        finalizedRoomStripeLineWidth={room.isFinalized && !specialRoom ? canvasColors.finalizedRoomStripeLineWidth : undefined}
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
        cx={labelCx}
        cy={labelCy}
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
            {!room.isFinalized && !placingElement && onWallHandleMouseDown &&
              selectedWallIndices.map(wi => {
                if (wi >= n) return null;
                const v1 = verts[wi];
                const v2 = verts[(wi + 1) % n];
                const mx = ((v1.x + v2.x) / 2) * PX_PER_M;
                const my = ((v1.y + v2.y) / 2) * PX_PER_M;
                const baseCursor = wallMidDragCursor(v1, v2);
                const cursor = rotatedResizeCursor(baseCursor, rot);
                const icon =
                  cursor === 'ns-resize' ? '⇅' : cursor === 'ew-resize' ? '⇄' : '↔';
                return (
                  <Group key={`whandle-${wi}`} x={mx} y={my}>
                    <Circle
                      radius={8}
                      fill="#3B82F6"
                      stroke="white"
                      strokeWidth={2}
                      listening={true}
                      onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = cursor;
                        e.target.to({ radius: 10, duration: 0.1 });
                      }}
                      onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = '';
                        e.target.to({ radius: 8, duration: 0.1 });
                      }}
                      onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
                        e.cancelBubble = true;
                        const stage = e.target.getStage();
                        if (!stage) return;
                        const pointer = stage.getPointerPosition();
                        if (!pointer) return;
                        const worldX = (pointer.x - stage.x()) / stage.scaleX();
                        const worldY = (pointer.y - stage.y()) / stage.scaleY();
                        onWallHandleMouseDown(wi, worldX, worldY);
                      }}
                    />
                    <Text
                      text={icon}
                      fontSize={10}
                      fill="white"
                      fontStyle="bold"
                      x={-5}
                      y={-5}
                      listening={false}
                    />
                  </Group>
                );
              })}
          </Group>
        );
      })()}
    </Group>
  );
}
