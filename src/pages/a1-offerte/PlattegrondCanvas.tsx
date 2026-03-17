import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { Stage as KonvaStage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { calcTotalWalls } from './types';
import { useTheme } from '../../hooks/useTheme';
import { WallId, DraggingHandle, SCALE_BY, HANDLE_CURSORS, PlattegrondCanvasProps } from './canvas/canvasTypes';
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
  const [draggingHandle, setDraggingHandle] = useState<DraggingHandle>(null);
  const [snapHighlight, setSnapHighlight] = useState<{ roomId: string; wall: 'top' | 'right' | 'bottom' | 'left' } | null>(null);
  const [dragFromWalls, setDragFromWalls] = useState<{ roomId: string; walls: WallId[] } | null>(null);

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
    onUpdateRoom(draggingHandle.roomId, { x: result.x, y: result.y, wallLengths: result.wallLengths });
  }, [draggingHandle, onUpdateRoom]);

  const handleHandleMouseUp = useCallback(() => { setDraggingHandle(null); }, []);

  const combinedMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (draggingHandle) { handleHandleMouseMove(e); return; }
    handleMouseMove(e);
  }, [draggingHandle, handleHandleMouseMove, handleMouseMove]);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
      <Stage
        width={size.width} height={size.height} scaleX={scale} scaleY={scale}
        x={stagePos.x} y={stagePos.y}
        draggable={!placingElement && !draggingHandle}
        onDragEnd={handleStageDragEnd} onWheel={handleWheel}
        onClick={handleStageClick} onMouseMove={combinedMouseMove} onMouseUp={handleHandleMouseUp}
        style={{ background: canvasColors.stageBg, cursor: draggingHandle ? HANDLE_CURSORS[draggingHandle.handle] : placingElement ? 'crosshair' : 'grab' }}
      >
        <CanvasGrid thinLines={grid.thin} thickLines={grid.thick} canvasColors={canvasColors} theme={theme} />
        <Layer>
          {rooms.map((room) => (
            <CanvasRoom
              key={room.id} room={room} rooms={rooms}
              selectedRoomId={selectedRoomId} selectedElementId={selectedElementId}
              placingElement={placingElement ?? null} ghostPos={ghostPos}
              draggingHandle={draggingHandle} cutRoomId={cutRoomId}
              canvasColors={canvasColors} theme={theme}
              activeDragWalls={dragFromWalls?.roomId === room.id ? dragFromWalls.walls : null}
              onSelectRoom={onSelectRoom} onMoveRoom={onMoveRoom}
              onUpdateRoom={onUpdateRoom} onUpdateElement={onUpdateElement}
              onPlaceElement={onPlaceElement} onSetSelectedElement={setSelectedElementId}
              onSetDraggingHandle={setDraggingHandle} onSnapHighlight={setSnapHighlight}
              onDragStartWalls={(roomId, walls) => setDragFromWalls({ roomId, walls })}
              onDragEndRoom={() => setDragFromWalls(null)}
            />
          ))}
          {snapHighlight && (() => {
            const r = computeSnapHighlightRect(rooms, snapHighlight);
            if (!r) return null;
            return <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#1A6BFF22" stroke="#1A6BFF" strokeWidth={1} opacity={0.8} listening={false} />;
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
