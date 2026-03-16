import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage as KonvaStage, Layer, Line, Rect, Arc, Circle, Text, Group, Shape } from 'react-konva';
import Konva from 'konva';
import { ZoomIn, ZoomOut, Hand, Copy, Scissors, ClipboardPaste, CopyPlus } from 'lucide-react';
import { Room, RoomElement, getShapePoints, getShapeType, calcTotalWalls, ROOM_TYPE_ICONS } from './types';
import { useTheme } from '../../hooks/useTheme';

const Stage = KonvaStage as unknown as React.ComponentType<any>;

const PX_PER_M = 40;
const SNAP_THRESHOLD = 20;
const SCALE_BY = 1.08;
const MIN_SCALE = 0.15;
const MAX_SCALE = 4;

type WallId = 'top' | 'right' | 'bottom' | 'left';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function nearestWall(px: number, py: number, w: number, h: number): { wall: WallId; position: number } {
  const dTop = py;
  const dBottom = h - py;
  const dLeft = px;
  const dRight = w - px;
  const min = Math.min(dTop, dBottom, dLeft, dRight);

  if (min === dTop) return { wall: 'top', position: clamp(px / w, 0.05, 0.95) };
  if (min === dBottom) return { wall: 'bottom', position: clamp(px / w, 0.05, 0.95) };
  if (min === dLeft) return { wall: 'left', position: clamp(py / h, 0.05, 0.95) };
  return { wall: 'right', position: clamp(py / h, 0.05, 0.95) };
}


function boundingSize(room: Room): { w: number; h: number } {
  const shapeType = room.shapeType ?? getShapeType(room.shape);
  if (shapeType === 'circle') {
    const d = room.length * PX_PER_M;
    return { w: d, h: d };
  }
  if (shapeType === 'halfcircle') {
    const outerRadius = (room.length * PX_PER_M) / 2;
    return { w: outerRadius * 2, h: outerRadius };
  }
  if (shapeType === 'plus') {
    return { w: room.length * PX_PER_M, h: room.width * PX_PER_M };
  }
  const rotated = room.rotation === 90 || room.rotation === 270;
  return {
    w: (rotated ? room.width : room.length) * PX_PER_M,
    h: (rotated ? room.length : room.width) * PX_PER_M,
  };
}

function snapPosition(draggedId: string, x: number, y: number, rooms: Room[]): { x: number; y: number } {
  const dragged = rooms.find(r => r.id === draggedId);
  if (!dragged) return { x, y };

  const { w: dw, h: dh } = boundingSize(dragged);
  let sx = x, sy = y;

  for (const other of rooms) {
    if (other.id === draggedId) continue;
    const { w: ow, h: oh } = boundingSize(other);

    if (Math.abs((x + dw) - other.x) < SNAP_THRESHOLD) sx = other.x - dw;
    if (Math.abs(x - (other.x + ow)) < SNAP_THRESHOLD) sx = other.x + ow;
    if (Math.abs((y + dh) - other.y) < SNAP_THRESHOLD) sy = other.y - dh;
    if (Math.abs(y - (other.y + oh)) < SNAP_THRESHOLD) sy = other.y + oh;

    if (Math.abs(y - other.y) < SNAP_THRESHOLD) sy = other.y;
    if (Math.abs(x - other.x) < SNAP_THRESHOLD) sx = other.x;
  }

  return { x: sx, y: sy };
}

function renderElementContent(
  type: RoomElement['type'],
  wall: WallId,
  elW: number,
) {
  const isDoor = type === 'deur' || type === 'schuifdeur';
  const isWindow = type === 'raam';
  const isHorizontal = wall === 'top' || wall === 'bottom';
  const thickness = isDoor ? 8 : isWindow ? 6 : 8;

  if (isDoor) {
    const arcRadius = Math.min(elW, 20);
    let arcX = 0, arcY = 0, arcAngle = 0;
    if (wall === 'top') { arcX = elW / 2; arcY = thickness; arcAngle = -90; }
    else if (wall === 'bottom') { arcX = elW / 2; arcY = 0; arcAngle = 90; }
    else if (wall === 'left') { arcX = thickness; arcY = elW / 2; arcAngle = 180; }
    else { arcX = 0; arcY = elW / 2; arcAngle = 0; }
    return (
      <>
        <Rect
          x={0} y={0}
          width={isHorizontal ? elW : thickness}
          height={isHorizontal ? thickness : elW}
          fill="#3B82F6"
          cornerRadius={1}
        />
        <Arc
          x={arcX} y={arcY}
          innerRadius={0}
          outerRadius={arcRadius}
          angle={90}
          rotation={arcAngle}
          fill="rgba(59,130,246,0.15)"
          stroke="#3B82F6"
          strokeWidth={0.5}
        />
      </>
    );
  }

  if (isWindow) {
    return (
      <>
        <Rect x={0} y={0} width={isHorizontal ? elW : thickness} height={isHorizontal ? thickness : elW} fill="#FFFFFF" cornerRadius={1} />
        {[1, 2, 3].map((i) => {
          const lx = (elW / 4) * i;
          const ly = (elW / 4) * i;
          return isHorizontal
            ? <Line key={i} points={[lx, 0, lx, thickness]} stroke="#999" strokeWidth={0.5} />
            : <Line key={i} points={[0, ly, thickness, ly]} stroke="#999" strokeWidth={0.5} />;
        })}
      </>
    );
  }

  const elementColors: Record<string, string> = {
    openhaard: '#EF4444',
    radiator: '#A855F7',
    kolom: '#6B7280',
    badkuip: '#06B6D4',
    toilet: '#10B981',
  };
  const fill = elementColors[type] ?? '#9CA3AF';
  return (
    <Rect
      x={0} y={0}
      width={isHorizontal ? elW : thickness}
      height={isHorizontal ? thickness : elW}
      fill={fill}
      cornerRadius={2}
    />
  );
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

type DraggingHandle = {
  roomId: string;
  handle: HandleType;
  startPos: { x: number; y: number };
  startRoom: Room;
} | null;

const HANDLE_CURSORS: Record<HandleType, string> = {
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
};

interface PlattegrondCanvasProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
  onMoveRoom: (id: string, x: number, y: number) => void;
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
  onUpdateElement?: (roomId: string, elementId: string, updates: Partial<RoomElement>) => void;
  placingElement?: { type: RoomElement['type']; width: number; height: number } | null;
  onPlaceElement?: (roomId: string, wall: WallId, position: number) => void;
  onCancelPlacing?: () => void;
  selectedRoom?: Room | null;
  clipboard?: Room | null;
  isCut?: boolean;
  cutRoomId?: string | null;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
}

export default function PlattegrondCanvas({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onMoveRoom,
  onUpdateRoom,
  onUpdateElement,
  placingElement,
  onPlaceElement,
  onCancelPlacing,
  selectedRoom,
  clipboard,
  isCut,
  cutRoomId,
  onDuplicate,
  onCopy,
  onCut,
  onPaste,
}: PlattegrondCanvasProps) {
  const { canvasColors } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [ghostPos, setGhostPos] = useState<{ wall: WallId; position: number } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<DraggingHandle>(null);

  const measure = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height - 44 });
    }
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!placingElement) {
      setGhostPos(null);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelPlacing?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placingElement, onCancelPlacing]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY));
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  const adjustZoom = useCallback((factor: number) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    const cx = size.width / 2;
    const cy = size.height / 2;
    setStagePos({
      x: cx - (cx - stagePos.x) * (newScale / scale),
      y: cy - (cy - stagePos.y) * (newScale / scale),
    });
    setScale(newScale);
  }, [scale, stagePos, size]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  }, []);

  const totals = rooms.reduce(
    (acc, r) => ({
      floor: acc.floor + r.length * r.width,
      walls: acc.walls + calcTotalWalls(r),
      ceiling: acc.ceiling + r.length * r.width,
    }),
    { floor: 0, walls: 0, ceiling: 0 },
  );

  const gridLines = useCallback(() => {
    if (!size.width || !size.height) return { thin: [] as { points: number[] }[], thick: [] as { points: number[] }[] };
    const thinStep = 80;
    const thickStep = 400;
    const x0 = Math.floor(-stagePos.x / scale / thinStep) * thinStep - thinStep;
    const y0 = Math.floor(-stagePos.y / scale / thinStep) * thinStep - thinStep;
    const x1 = x0 + size.width / scale + thinStep * 2;
    const y1 = y0 + size.height / scale + thinStep * 2;
    const thin: { points: number[] }[] = [];
    const thick: { points: number[] }[] = [];
    for (let x = Math.floor(x0 / thinStep) * thinStep; x <= x1; x += thinStep) {
      const pts = [x, y0, x, y1];
      if (x % thickStep === 0) thick.push({ points: pts });
      else thin.push({ points: pts });
    }
    for (let y = Math.floor(y0 / thinStep) * thinStep; y <= y1; y += thinStep) {
      const pts = [x0, y, x1, y];
      if (y % thickStep === 0) thick.push({ points: pts });
      else thin.push({ points: pts });
    }
    return { thin, thick };
  }, [size, stagePos, scale]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!placingElement || !selectedRoomId) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    const shapeType = room.shapeType ?? getShapeType(room.shape);
    const w = room.length * PX_PER_M;
    const h = shapeType === 'circle' ? w : room.width * PX_PER_M;
    const rot = room.rotation || 0;
    const rad = (rot * Math.PI) / 180;

    const worldX = (pointer.x - stage.x()) / stage.scaleX();
    const worldY = (pointer.y - stage.y()) / stage.scaleY();

    const dx = worldX - (room.x + w / 2);
    const dy = worldY - (room.y + h / 2);
    const localX = dx * Math.cos(-rad) - dy * Math.sin(-rad) + w / 2;
    const localY = dx * Math.sin(-rad) + dy * Math.cos(-rad) + h / 2;

    if (localX >= 0 && localX <= w && localY >= 0 && localY <= h) {
      setGhostPos(nearestWall(localX, localY, w, h));
    } else {
      setGhostPos(null);
    }
  }, [placingElement, selectedRoomId, rooms]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (placingElement && selectedRoomId && ghostPos) {
      onPlaceElement?.(selectedRoomId, ghostPos.wall, ghostPos.position);
      return;
    }
    setSelectedElementId(null);
    if (e.target === e.target.getStage()) onSelectRoom(null);
  }, [placingElement, selectedRoomId, ghostPos, onPlaceElement, onSelectRoom]);

  const handleHandleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!draggingHandle || !onUpdateRoom) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const worldX = (pos.x - stage.x()) / stage.scaleX();
    const worldY = (pos.y - stage.y()) / stage.scaleY();
    const startWorldX = (draggingHandle.startPos.x - stage.x()) / stage.scaleX();
    const startWorldY = (draggingHandle.startPos.y - stage.y()) / stage.scaleY();
    const dx = worldX - startWorldX;
    const dy = worldY - startWorldY;

    const { startRoom, handle } = draggingHandle;
    let newX = startRoom.x;
    let newY = startRoom.y;
    let newLength = startRoom.length;
    let newWidth = startRoom.width;

    if (handle === 'se') { newLength = startRoom.length + dx / PX_PER_M; newWidth = startRoom.width + dy / PX_PER_M; }
    if (handle === 'sw') { newLength = startRoom.length - dx / PX_PER_M; newWidth = startRoom.width + dy / PX_PER_M; newX = startRoom.x + dx; }
    if (handle === 'ne') { newLength = startRoom.length + dx / PX_PER_M; newWidth = startRoom.width - dy / PX_PER_M; newY = startRoom.y + dy; }
    if (handle === 'nw') { newLength = startRoom.length - dx / PX_PER_M; newWidth = startRoom.width - dy / PX_PER_M; newX = startRoom.x + dx; newY = startRoom.y + dy; }
    if (handle === 'e') { newLength = startRoom.length + dx / PX_PER_M; }
    if (handle === 'w') { newLength = startRoom.length - dx / PX_PER_M; newX = startRoom.x + dx; }
    if (handle === 's') { newWidth = startRoom.width + dy / PX_PER_M; }
    if (handle === 'n') { newWidth = startRoom.width - dy / PX_PER_M; newY = startRoom.y + dy; }

    newLength = Math.max(1, newLength);
    newWidth = Math.max(1, newWidth);

    onUpdateRoom(draggingHandle.roomId, {
      x: newX, y: newY,
      length: parseFloat(newLength.toFixed(1)),
      width: parseFloat(newWidth.toFixed(1)),
    });
  }, [draggingHandle, onUpdateRoom]);

  const handleHandleMouseUp = useCallback(() => {
    setDraggingHandle(null);
  }, []);

  const combinedMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (draggingHandle) {
      handleHandleMouseMove(e);
      return;
    }
    handleMouseMove(e);
  }, [draggingHandle, handleHandleMouseMove, handleMouseMove]);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
      <Stage
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={!placingElement && !draggingHandle}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
          if (e.target !== e.target.getStage()) return;
          setStagePos({ x: e.target.x(), y: e.target.y() });
        }}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseMove={combinedMouseMove}
        onMouseUp={handleHandleMouseUp}
        style={{ background: canvasColors.stageBg, cursor: draggingHandle ? HANDLE_CURSORS[draggingHandle.handle] : placingElement ? 'crosshair' : 'grab' }}
      >
        <Layer listening={false}>
          {gridLines().thin.map((line, i) => (
            <Line key={`t-${i}`} points={line.points} stroke={canvasColors.gridThin} strokeWidth={1} listening={false} />
          ))}
          {gridLines().thick.map((line, i) => (
            <Line key={`k-${i}`} points={line.points} stroke={canvasColors.gridThick} strokeWidth={1} listening={false} />
          ))}
        </Layer>
        <Layer>
          {rooms.map((room) => {
            const shapeType = room.shapeType ?? getShapeType(room.shape);
            const w = room.length * PX_PER_M;
            const h = shapeType === 'circle' ? w : room.width * PX_PER_M;
            const rot = room.rotation || 0;
            const cx = w / 2;
            const cy = h / 2;
            const isSelected = room.id === selectedRoomId;
            const area = shapeType === 'circle' ? Math.PI * (room.length / 2) ** 2 : shapeType === 'halfcircle' ? (Math.PI * (room.length / 2) ** 2) / 2 : room.length * room.width;
            const points = getShapePoints(room.shape, w, h);
            const showWallNumbers = shapeType === 'rect' || shapeType === 'plus';
            const stroke = isSelected ? canvasColors.roomStrokeSelected : canvasColors.roomStroke;

            return (
              <Group
                key={room.id}
                x={room.x + cx}
                y={room.y + cy}
                offsetX={cx}
                offsetY={cy}
                rotation={rot}
                opacity={room.id === cutRoomId ? 0.4 : 1}
                draggable={!placingElement && !draggingHandle}
                onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                  const newX = e.target.x() - cx;
                  const newY = e.target.y() - cy;
                  const snapped = snapPosition(room.id, newX, newY, rooms);
                  e.target.x(snapped.x + cx);
                  e.target.y(snapped.y + cy);
                  onMoveRoom(room.id, snapped.x, snapped.y);
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
                {shapeType === 'rect' && (() => {
                  const topSloped = room.walls.top.heightLeft !== room.walls.top.heightRight;
                  const useGradient = topSloped;
                  const higherLeft = room.walls.top.heightLeft > room.walls.top.heightRight;

                  return (
                    <Line
                      points={points}
                      closed
                      stroke={stroke}
                      strokeWidth={isSelected ? 2 : 1}
                      {...(useGradient
                        ? {
                            fillLinearGradientStartPoint: { x: 0, y: 0 },
                            fillLinearGradientEndPoint: { x: w, y: 0 },
                            fillLinearGradientColorStops: higherLeft
                              ? [0, 'rgba(255,255,255,0.08)', 1, canvasColors.roomFill]
                              : [0, canvasColors.roomFill, 1, 'rgba(255,255,255,0.08)'],
                          }
                        : { fill: canvasColors.roomFill })}
                    />
                  );
                })()}
                {shapeType === 'rect' && (() => {
                  const slopedWalls: { wall: string; x1: number; y1: number; x2: number; y2: number }[] = [];
                  if (room.walls.top.heightLeft !== room.walls.top.heightRight)
                    slopedWalls.push({ wall: 'top', x1: 0, y1: 0, x2: w, y2: 0 });
                  if (room.walls.bottom.heightLeft !== room.walls.bottom.heightRight)
                    slopedWalls.push({ wall: 'bottom', x1: 0, y1: h, x2: w, y2: h });
                  if (room.walls.left.heightLeft !== room.walls.left.heightRight)
                    slopedWalls.push({ wall: 'left', x1: 0, y1: 0, x2: 0, y2: h });
                  if (room.walls.right.heightLeft !== room.walls.right.heightRight)
                    slopedWalls.push({ wall: 'right', x1: w, y1: 0, x2: w, y2: h });
                  if (slopedWalls.length === 0) return null;
                  return (
                    <>
                      {slopedWalls.map((sw) => (
                        <React.Fragment key={sw.wall}>
                          <Line
                            points={[sw.x1, sw.y1, sw.x2, sw.y2]}
                            stroke="#FF5C1A"
                            strokeWidth={1.5}
                            dash={[4, 3]}
                            opacity={0.6}
                            listening={false}
                          />
                          <Line
                            points={[sw.x1, sw.y1, sw.x1 + 8, sw.y1, sw.x1, sw.y1 + 8]}
                            closed
                            fill="#FF5C1A"
                            opacity={0.7}
                            listening={false}
                          />
                        </React.Fragment>
                      ))}
                    </>
                  );
                })()}
                {shapeType === 'circle' && (
                  <Circle
                    x={cx}
                    y={cy}
                    radius={(room.length * PX_PER_M) / 2}
                    fill={canvasColors.roomFill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                )}
                {shapeType === 'halfcircle' && (
                  <Arc
                    x={cx}
                    y={cy}
                    innerRadius={0}
                    outerRadius={(room.length * PX_PER_M) / 2}
                    angle={180}
                    rotation={-90}
                    fill={canvasColors.roomFill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                )}
                {shapeType === 'plus' && (
                  <Shape
                    sceneFunc={(context: any, shape: any) => {
                      const tx = w / 3;
                      const ty = h / 3;
                      context.beginPath();
                      context.moveTo(tx, 0);
                      context.lineTo(w - tx, 0);
                      context.lineTo(w - tx, ty);
                      context.lineTo(w, ty);
                      context.lineTo(w, h - ty);
                      context.lineTo(w - tx, h - ty);
                      context.lineTo(w - tx, h);
                      context.lineTo(tx, h);
                      context.lineTo(tx, h - ty);
                      context.lineTo(0, h - ty);
                      context.lineTo(0, ty);
                      context.lineTo(tx, ty);
                      context.closePath();
                      context.fillStrokeShape(shape);
                    }}
                    fill={canvasColors.roomFill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                )}
                {room.roomType && room.roomType !== 'normal' && (
                  <Text
                    text={ROOM_TYPE_ICONS[room.roomType] || ''}
                    x={w - 20}
                    y={4}
                    rotation={-rot}
                    fontSize={14}
                    fontFamily="sans-serif"
                  />
                )}
                <Text
                  text={`${room.name}\n${area.toFixed(1)} m²`}
                  x={8}
                  y={8}
                  rotation={-rot}
                  fontSize={12}
                  fontFamily="DM Sans, sans-serif"
                  fill={isSelected ? canvasColors.textSelected : canvasColors.text}
                  opacity={isSelected ? 1 : 0.6}
                  lineHeight={1.4}
                />
                {showWallNumbers && (
                  <>
                    <Text text="1" x={w / 2 - 4} y={2} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
                    <Text text="2" x={w - 12} y={h / 2 - 5} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
                    <Text text="3" x={w / 2 - 4} y={h - 14} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
                    <Text text="4" x={2} y={h / 2 - 5} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
                  </>
                )}

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
                      draggable={!!onUpdateElement}
                      dragBoundFunc={dragBoundFunc}
                      onDragEnd={handleDragEnd}
                      onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                        e.cancelBubble = true;
                        setSelectedElementId(el.id);
                      }}
                    >
                      {renderElementContent(el.type, el.wall, elW)}
                      <Rect
                        x={0} y={0}
                        width={bw} height={bh}
                        fill="transparent"
                        stroke={isElSelected ? '#FF5C1A' : 'rgba(255,255,255,0.4)'}
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

                {isSelected && onUpdateRoom && (shapeType === 'rect' || shapeType === 'plus') && !placingElement && (() => {
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
                  return handles.map(hp => (
                    <Circle
                      key={hp.type}
                      x={hp.x}
                      y={hp.y}
                      radius={handleSize}
                      fill="#FF5C1A"
                      stroke="#fff"
                      strokeWidth={1}
                      onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
                        e.cancelBubble = true;
                        const stage = e.target.getStage();
                        if (!stage) return;
                        const pos = stage.getPointerPosition();
                        if (!pos) return;
                        setDraggingHandle({
                          roomId: room.id,
                          handle: hp.type,
                          startPos: pos,
                          startRoom: { ...room },
                        });
                      }}
                      onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
                        const stage = e.target.getStage();
                        if (stage) {
                          const container = stage.container();
                          container.style.cursor = HANDLE_CURSORS[hp.type];
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
                  ));
                })()}

                {/* Ghost element during placement mode */}
                {isSelected && placingElement && ghostPos && (() => {
                  const elW = placingElement.width * PX_PER_M;
                  const isDoor = placingElement.type === 'deur' || placingElement.type === 'schuifdeur';
                  const thickness = isDoor ? 8 : 6;
                  const gPos = clamp(ghostPos.position, 0.05, 0.95);
                  let gx = 0, gy = 0;
                  switch (ghostPos.wall) {
                    case 'top': gx = w * gPos - elW / 2; gy = 0; break;
                    case 'right': gx = w - thickness; gy = h * gPos - elW / 2; break;
                    case 'bottom': gx = w * gPos - elW / 2; gy = h - thickness; break;
                    case 'left': gx = 0; gy = h * gPos - elW / 2; break;
                  }
                  return (
                    <Group x={gx} y={gy} opacity={0.5}>
                      {renderElementContent(placingElement.type, ghostPos.wall, elW)}
                    </Group>
                  );
                })()}
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {placingElement && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium shadow-lg">
          Klik op een muur om te plaatsen — Esc om te annuleren
        </div>
      )}

      {(selectedRoom || clipboard) && (
        <div className="h-10 shrink-0 flex items-center gap-2 px-4 border-t border-dark-border bg-dark-card">
          {selectedRoom && (
            <>
              <button
                onClick={onDuplicate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-light/60 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <CopyPlus size={14} />
                Dupliceer
              </button>
              <button
                onClick={onCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-light/60 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <Copy size={14} />
                Kopieer
              </button>
              <button
                onClick={onCut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-light/60 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <Scissors size={14} />
                Knippen
              </button>
            </>
          )}
          {clipboard && (
            <button
              onClick={onPaste}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-light/60 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
            >
              <ClipboardPaste size={14} />
              Plakken
            </button>
          )}
        </div>
      )}

      <div className="h-11 shrink-0 flex items-center px-4 border-t border-dark-border bg-dark-card text-xs text-light/50">
        <div className="flex items-center gap-6 flex-1">
          <span>Kamers: <span className="text-light">{rooms.length}</span></span>
          <span>Vloer: <span className="text-light">{totals.floor.toFixed(1)} m²</span></span>
          <span>Wanden: <span className="text-light">{totals.walls.toFixed(1)} m²</span></span>
          <span>Plafond: <span className="text-light">{totals.ceiling.toFixed(1)} m²</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Hand size={12} className="text-light/25" />
          <div className="flex items-center gap-1">
            <button onClick={() => adjustZoom(1 / SCALE_BY)} className="p-1 rounded hover:bg-dark-hover text-light/40 hover:text-light transition-colors cursor-pointer" title="Zoom uit">
              <ZoomOut size={14} />
            </button>
            <button onClick={resetZoom} className="px-1.5 py-0.5 rounded hover:bg-dark-hover text-light/40 hover:text-light transition-colors text-[10px] cursor-pointer tabular-nums" title="Reset zoom">
              {Math.round(scale * 100)}%
            </button>
            <button onClick={() => adjustZoom(SCALE_BY)} className="p-1 rounded hover:bg-dark-hover text-light/40 hover:text-light transition-colors cursor-pointer" title="Zoom in">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
