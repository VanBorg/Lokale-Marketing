import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { Stage as KonvaStage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { calcTotalWalls, ensureVertices, syncRoomFromVertices } from './types';
import { useTheme } from '../../hooks/useTheme';
import { WallId, DraggingHandle, DraggingVertex, SCALE_BY, HANDLE_CURSORS, PX_PER_M, PlattegrondCanvasProps } from './canvas/canvasTypes';
import { computeGridLines, computeHandleDrag, computeGhostPos, computeSnapHighlightRect } from './canvas/canvasUtils';
import { useCanvasStage } from './canvas/useCanvasStage';
import CanvasGrid from './canvas/CanvasGrid';
import CanvasRoom from './canvas/CanvasRoom';
import CanvasToolbar from './canvas/CanvasToolbar';

const Stage = KonvaStage as unknown as React.ComponentType<any>;

export interface PlattegrondCanvasHandle {
  goToCenter: () => void;
}

const PlattegrondCanvas = forwardRef<PlattegrondCanvasHandle, PlattegrondCanvasProps>(function PlattegrondCanvas({
  rooms, selectedRoomId, onSelectRoom, onMoveRoom, onUpdateRoom, onUpdateElement,
  placingElement, onPlaceElement, onCancelPlacing,
  selectedRoom, clipboard, isCut, cutRoomId,
  onDuplicate, onCopy, onCut, onPaste,
  beginBatch, endBatch,
  selectedWallIndices,
}, ref) {
  const { theme, canvasColors } = useTheme();
  const { containerRef, size, scale, stagePos, handleWheel, adjustZoom, resetZoom, goToCenter, handleStageDragEnd } = useCanvasStage();
  const goToCenterRef = useRef(goToCenter);
  goToCenterRef.current = goToCenter;

  useImperativeHandle(ref, () => ({ goToCenter }), [goToCenter]);

  useEffect(() => {
    goToCenter();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancelPlacing?.(); return; }
      if (e.key === 's' || e.key === 'S') {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        goToCenterRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancelPlacing]);

  const [ghostPos, setGhostPos] = useState<{ wall: WallId; position: number } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandleRaw] = useState<DraggingHandle>(null);
  const [draggingVertex, setDraggingVertex] = useState<DraggingVertex>(null);
  const [snapHighlight, setSnapHighlight] = useState<{ roomId: string; wall: 'top' | 'right' | 'bottom' | 'left' } | null>(null);
  const [dragFromWalls, setDragFromWalls] = useState<{ roomId: string; walls: WallId[] } | null>(null);

  const setDraggingHandle = useCallback((handle: DraggingHandle) => {
    if (handle && !draggingHandle) beginBatch?.();
    setDraggingHandleRaw(handle);
  }, [draggingHandle, beginBatch]);

  useEffect(() => {
    if (!placingElement) setGhostPos(null);
  }, [placingElement]);

  const totals = rooms.reduce(
    (acc, r) => ({ floor: acc.floor + r.length * r.width, walls: acc.walls + calcTotalWalls(r), ceiling: acc.ceiling + r.length * r.width }),
    { floor: 0, walls: 0, ceiling: 0 },
  );

  const grid = computeGridLines(size, stagePos, scale);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!placingElement || !selectedRoomId) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;
    setGhostPos(computeGhostPos(room, pointer.x, pointer.y, stage.x(), stage.y(), stage.scaleX(), stage.scaleY()));
  }, [placingElement, selectedRoomId, rooms]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (placingElement && selectedRoomId && ghostPos) { onPlaceElement?.(selectedRoomId, ghostPos.wall, ghostPos.position); return; }
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
    const result = computeHandleDrag(draggingHandle.handle, draggingHandle.startRoom,
      worldX - draggingHandle.startWorldPos.x, worldY - draggingHandle.startWorldPos.y);
    onUpdateRoom(draggingHandle.roomId, {
      x: result.x, y: result.y,
      wallLengths: result.wallLengths,
      vertices: result.vertices,
      length: result.length,
      width: result.width,
    });
  }, [draggingHandle, onUpdateRoom]);

  const handleVertexMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!draggingVertex || !onUpdateRoom) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const worldX = (pos.x - stage.x()) / stage.scaleX();
    const worldY = (pos.y - stage.y()) / stage.scaleY();

    const sv = draggingVertex.startVertices;
    // Derive start bounding box from startVertices (in metres)
    const minVX = Math.min(...sv.map(v => v.x));
    const maxVX = Math.max(...sv.map(v => v.x));
    const minVY = Math.min(...sv.map(v => v.y));
    const maxVY = Math.max(...sv.map(v => v.y));
    const startW = (maxVX - minVX) * PX_PER_M;
    const startH = (maxVY - minVY) * PX_PER_M;
    const startCx = startW / 2;
    const startCy = startH / 2;

    const rot = draggingVertex.startRotation * Math.PI / 180;

    // Translate world pos relative to room center at drag start
    const lx = worldX - (draggingVertex.startRoomPos.x + startCx);
    const ly = worldY - (draggingVertex.startRoomPos.y + startCy);

    // Un-rotate to get local room coordinates
    const cosA = Math.cos(-rot);
    const sinA = Math.sin(-rot);
    const ux = lx * cosA - ly * sinA + startCx;
    const uy = lx * sinA + ly * cosA + startCy;

    // Convert to metres and snap to 0.05 m grid
    const snapM = 0.05;
    const newMX = Math.round((ux / PX_PER_M) / snapM) * snapM;
    const newMY = Math.round((uy / PX_PER_M) / snapM) * snapM;

    // Rebuild vertices from startVertices so we don't accumulate rounding errors
    const newVerts = sv.map((v, i) =>
      i === draggingVertex.vertexIndex ? { x: newMX, y: newMY } : { ...v }
    );

    // Normalise: shift so the bounding box min is (0, 0)
    const minX = Math.min(...newVerts.map(v => v.x));
    const minY = Math.min(...newVerts.map(v => v.y));
    const normalizedVerts = newVerts.map(v => ({ x: v.x - minX, y: v.y - minY }));

    // Compensate room position for the bounding-box shift
    const newRoomX = draggingVertex.startRoomPos.x + minX * PX_PER_M;
    const newRoomY = draggingVertex.startRoomPos.y + minY * PX_PER_M;

    const synced = syncRoomFromVertices(normalizedVerts);
    onUpdateRoom(draggingVertex.roomId, {
      x: newRoomX,
      y: newRoomY,
      vertices: normalizedVerts,
      length: synced.length,
      width: synced.width,
      wallLengths: synced.wallLengths,
    });
  }, [draggingVertex, onUpdateRoom]);

  const handleMouseUp = useCallback(() => {
    if (draggingHandle) {
      endBatch?.();
      setDraggingHandleRaw(null);
    }
    if (draggingVertex) {
      endBatch?.();
      setDraggingVertex(null);
    }
  }, [draggingHandle, draggingVertex, endBatch]);

  const handleVertexHandleMouseDown = useCallback((roomId: string, vertexIndex: number, worldX: number, worldY: number) => {
    beginBatch?.();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const startVertices = ensureVertices(room);
    setDraggingVertex({
      roomId,
      vertexIndex,
      startWorldPos: { x: worldX, y: worldY },
      startVertices,
      startRoomPos: { x: room.x, y: room.y },
      startRotation: room.rotation || 0,
    });
  }, [rooms, beginBatch]);

  const combinedMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (draggingHandle) { handleHandleMouseMove(e); return; }
    if (draggingVertex) { handleVertexMouseMove(e); return; }
    handleMouseMove(e);
  }, [draggingHandle, draggingVertex, handleHandleMouseMove, handleVertexMouseMove, handleMouseMove]);

  const isDraggingVertex = draggingVertex !== null;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
      <Stage
        width={size.width} height={size.height} scaleX={scale} scaleY={scale}
        x={stagePos.x} y={stagePos.y}
        draggable={!placingElement && !draggingHandle && !isDraggingVertex}
        onDragEnd={handleStageDragEnd} onWheel={handleWheel}
        onClick={handleStageClick} onMouseMove={combinedMouseMove} onMouseUp={handleMouseUp}
        style={{
          background: canvasColors.stageBg,
          cursor: draggingHandle
            ? HANDLE_CURSORS[draggingHandle.handle]
            : isDraggingVertex
              ? 'crosshair'
              : placingElement
                ? 'crosshair'
                : 'grab',
        }}
      >
        <CanvasGrid thinLines={grid.thin} thickLines={grid.thick} canvasColors={canvasColors} theme={theme} />
        <Layer>
          {rooms.map((room) => (
            <CanvasRoom
              key={room.id} room={room} rooms={rooms}
              selectedRoomId={selectedRoomId} selectedElementId={selectedElementId}
              placingElement={placingElement ?? null} ghostPos={ghostPos}
              draggingHandle={draggingHandle}
              isDraggingVertex={isDraggingVertex}
              cutRoomId={cutRoomId}
              canvasColors={canvasColors} theme={theme}
              activeDragWalls={dragFromWalls?.roomId === room.id ? dragFromWalls.walls : null}
              selectedWallIndices={room.id === selectedRoomId ? (selectedWallIndices ?? []) : []}
              onSelectRoom={onSelectRoom} onMoveRoom={onMoveRoom}
              onUpdateRoom={onUpdateRoom} onUpdateElement={onUpdateElement}
              onPlaceElement={onPlaceElement} onSetSelectedElement={setSelectedElementId}
              onSetDraggingHandle={setDraggingHandle}
              onSnapHighlight={setSnapHighlight}
              onDragStartWalls={(roomId, walls) => setDragFromWalls({ roomId, walls })}
              onDragEndRoom={() => setDragFromWalls(null)}
              onVertexHandleMouseDown={(vi, wx, wy) => handleVertexHandleMouseDown(room.id, vi, wx, wy)}
            />
          ))}
          {snapHighlight && (() => {
            const r = computeSnapHighlightRect(rooms, snapHighlight);
            if (!r) return null;
            return <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#FF5C1A22" stroke="#FF5C1A" strokeWidth={1} opacity={0.8} listening={false} />;
          })()}
        </Layer>
      </Stage>
      <CanvasToolbar
        rooms={rooms} selectedRoom={selectedRoom} clipboard={clipboard}
        placingElement={!!placingElement} scale={scale} totals={totals}
        onDuplicate={onDuplicate} onCopy={onCopy} onCut={onCut} onPaste={onPaste}
        onZoomIn={() => adjustZoom(SCALE_BY)} onZoomOut={() => adjustZoom(1 / SCALE_BY)}
        onResetZoom={resetZoom}
      />
    </div>
  );
});

export default PlattegrondCanvas;
