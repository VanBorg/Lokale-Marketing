import React, { useEffect, useCallback, useImperativeHandle, forwardRef, useRef, useMemo, useState } from 'react';
import { Stage as KonvaStage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';
import { calcTotalWalls, getDependentRoomsForFinalization, RoomType } from '../types';
import { useTheme } from '../../../hooks/useTheme';
import { SCALE_BY, HANDLE_CURSORS, PlattegrondCanvasProps, GapInfo, CornerFillInfo } from './canvasTypes';
import { rotatedResizeCursor } from './canvasGeometry';
import { computeGridLines, computeSnapHighlightRect, boundingSize } from './canvasGeometry';
import { detectRoomGaps, detectCornerFills } from './canvasWizard';
import CornerFillWand from './CornerFillWand';
import { useCanvasStage } from './hooks/useCanvasStage';
import { usePlattegrondAutoPan } from './hooks/usePlattegrondAutoPan';
import { usePlattegrondWizardHandlers } from './hooks/usePlattegrondWizardHandlers';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useHandleDrag } from './hooks/useHandleDrag';
import { useVertexDrag } from './hooks/useVertexDrag';
import { useElementPlacing } from './hooks/useElementPlacing';
import CanvasGrid from './CanvasGrid';
import CanvasRoom from './CanvasRoom';
import CanvasToolbar from './CanvasToolbar';
import WizardWand from './WizardWand';

const Stage = KonvaStage as unknown as React.ComponentType<any>;

export type PendingSpecialRoomState = { type: RoomType; name: string; length: number; width: number };

export type PlattegrondCanvasExtendedProps = PlattegrondCanvasProps & {
  pendingSpecialRoom: PendingSpecialRoomState | null;
  pendingTargetRoomId: string | null;
  onSelectTargetRoom: (roomId: string) => void;
  onCancelPendingSpecial: () => void;
  onConfirmPlaceFinalized: () => void;
  onCancelPlaceFinalized: () => void;
  onAddRoomFromCornerFill?: (x: number, y: number, widthM: number, heightM: number) => void;
};

export interface PlattegrondCanvasHandle {
  goToCenter: () => void;
  /** World coords of viewport center; use for spawning new rooms in view. */
  getSpawnPosition: () => { x: number; y: number };
}

const PlattegrondCanvas = forwardRef<PlattegrondCanvasHandle, PlattegrondCanvasExtendedProps>(function PlattegrondCanvas({
  rooms, selectedRoomId, onSelectRoom, selectedRoomIds, onSelectedRoomIdsChange, onMoveRoom, onUpdateRoom, onUpdateElement,
  placingElement, onPlaceElement, onCancelPlacing,
  selectedRoom, clipboard, isCut, cutRoomId,
  onDuplicate, onCopy, onCut, onPaste,
  onMoveRooms,
  beginBatch, endBatch,
  selectedWallIndices,
  shouldConfirmClearRoomSelection,
  onRequestClearRoomSelectionConfirm,
  canUndo, canRedo, onUndo, onRedo,
  pendingSpecialRoom,
  pendingTargetRoomId,
  onSelectTargetRoom,
  onCancelPendingSpecial,
  onConfirmPlaceFinalized,
  onCancelPlaceFinalized,
  onAddRoomFromCornerFill,
}, ref) {
  const { theme, canvasColors } = useTheme();
  const { containerRef, stageRef, size, scale, stagePos, setStagePos, handleWheel, adjustZoom, resetZoom, goToCenter, handleStageDragEnd } = useCanvasStage();
  const goToCenterRef = useRef(goToCenter);
  goToCenterRef.current = goToCenter;

  const getSpawnPosition = useCallback(() => ({
    x: (size.width / 2 - stagePos.x) / scale,
    y: (size.height / 2 - stagePos.y) / scale,
  }), [size, stagePos, scale]);
  useImperativeHandle(ref, () => ({ goToCenter, getSpawnPosition }), [goToCenter, getSpawnPosition]);
  useEffect(() => { goToCenter(); }, []);

  const justFinishedDragRef = useRef(false);
  const draggedRoomIdsRef = useRef<Set<string> | null>(null);
  const draggedRoomPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const { ghostPos, setGhostPos, selectedElementId, setSelectedElementId, handleMouseMove } = useElementPlacing({ placingElement, selectedRoomId, rooms });

  const {
    draggingHandle, setDraggingHandle, snapHighlight, setSnapHighlight, dragFromWalls, setDragFromWalls,
    handleHandleMouseMove, onHandleMouseUp,
  } = useHandleDrag({ rooms, onUpdateRoom, beginBatch, endBatch, justFinishedDragRef });

  const {
    draggingVertex, setDraggingVertex, draggingWall, setDraggingWall,
    handleVertexMouseMove, handleWallMouseMove, handleVertexHandleMouseDown, handleWallHandleMouseDown, onVertexMouseUp,
  } = useVertexDrag({ rooms, onUpdateRoom, beginBatch, endBatch, justFinishedDragRef });

  const {
    selectedRoomIdsValue, setSelectedRoomIds, multiDragDelta, setMultiDragDelta, multiDragOriginIdRef,
    marquee, setMarquee, modifierHeld, selectRoom, selectRoomForCanvas, handleRoomClick,
    handleRoomDragMove, handleMoveRoom, handleStageMouseDown, handleStageClick, onMarqueeMouseUp,
  } = useCanvasInteraction({
    rooms, selectedRoomId, selectedRoomIds, onSelectedRoomIdsChange, onSelectRoom, onMoveRoom, onMoveRooms,
    pendingSpecialRoom, pendingTargetRoomId, onSelectTargetRoom,
    shouldConfirmClearRoomSelection, onRequestClearRoomSelectionConfirm, justFinishedDragRef,
  });

  // Keep dragged room positions in sync during drag (for auto-pan compensation)
  if (dragFromWalls && draggedRoomIdsRef.current) {
    for (const id of Array.from(draggedRoomIdsRef.current)) {
      const r = rooms.find(room => room.id === id);
      if (r && !r.isFinalized) draggedRoomPositionsRef.current[id] = { x: r.x, y: r.y };
    }
  }

  const [wizardGaps, setWizardGaps] = useState<GapInfo[]>([]);
  const [wizardPreview, setWizardPreview] = useState<{ vertices: number[] } | null>(null);
  const [hoveredTargetRoomId, setHoveredTargetRoomId] = useState<string | null>(null);
  const [cornerFills, setCornerFills] = useState<CornerFillInfo[]>([]);
  const [cornerFillPreview, setCornerFillPreview] = useState<CornerFillInfo | null>(null);

  const { handleWizardFill, handleWizardCarve, handleWizardHoverStart, handleWizardHoverEnd, wizardGapsRef, handleWizardFillRef, selectedSpecialActionTarget } = usePlattegrondWizardHandlers({
    rooms, onUpdateRoom, beginBatch, endBatch, wizardGaps, setWizardPreview, selectedRoomId, scale,
  });

  const { EDGE_THRESHOLD, stopAutoPan, ensureAutoPan, handleRoomDragMovePosition } = usePlattegrondAutoPan({
    stageRef, size, scale, stagePos, setStagePos, onMoveRoom, onMoveRooms,
    draggedRoomIdsRef, draggedRoomPositionsRef, dragFromWalls,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancelPlacing?.(); onCancelPendingSpecial?.(); return; }
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); goToCenterRef.current(); }
      if ((e.key === 'w' || e.key === 'W') && wizardGapsRef.current.length > 0) { e.preventDefault(); handleWizardFillRef.current(wizardGapsRef.current[0]); }
      if ((e.key === 'd' || e.key === 'D') && selectedRoomId && onUpdateRoom) {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room || room.isFinalized) return;
        e.preventDefault();
        const dependents = getDependentRoomsForFinalization(room, rooms);
        onUpdateRoom(room.id, { isFinalized: true });
        dependents.forEach(d => { if (!d.isFinalized) onUpdateRoom(d.id, { isFinalized: true }); });
      }
      if ((e.key === 'b' || e.key === 'B') && selectedRoomId && onUpdateRoom) {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (room?.isFinalized) {
          e.preventDefault();
          onUpdateRoom(selectedRoomId, { isFinalized: false });
          getDependentRoomsForFinalization(room, rooms).forEach(d => { if (d.isFinalized) onUpdateRoom(d.id, { isFinalized: false }); });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancelPlacing, onCancelPendingSpecial, selectedRoomId, rooms, onUpdateRoom]);

  useEffect(() => {
    if (!selectedRoomId) { setWizardGaps([]); return; }
    const selected = rooms.find(r => r.id === selectedRoomId);
    if (!selected || selected.isFinalized) { setWizardGaps([]); return; }
    const wizardTarget = selected.roomType === 'normal'
      ? selected
      : (selected.parentRoomId ? rooms.find(r => r.id === selected.parentRoomId && r.roomType === 'normal') ?? null : null);
    if (!wizardTarget || wizardTarget.isFinalized) { setWizardGaps([]); return; }
    let gaps = detectRoomGaps(wizardTarget, rooms);
    if (selected.roomType !== 'normal') {
      gaps = gaps.filter(g => Math.abs(g.direction.nx) > 0.01 && Math.abs(g.direction.ny) > 0.01);
    }
    setWizardGaps(gaps);
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    setCornerFills(detectCornerFills(rooms));
  }, [rooms]);

  const handleCornerFill = useCallback((fill: CornerFillInfo) => {
    onAddRoomFromCornerFill?.(fill.fillX, fill.fillY, fill.fillWm, fill.fillHm);
    setCornerFillPreview(null);
  }, [onAddRoomFromCornerFill]);

  const totals = rooms.reduce(
    (acc, r) => ({ floor: acc.floor + r.length * r.width, walls: acc.walls + calcTotalWalls(r), ceiling: acc.ceiling + r.length * r.width }),
    { floor: 0, walls: 0, ceiling: 0 },
  );
  const grid = computeGridLines(size, stagePos, scale);
  const sortedRoomsForPaint = useMemo(
    () => [...rooms].sort((a, b) => a.id === selectedRoomId ? 1 : b.id === selectedRoomId ? -1 : 0),
    [rooms, selectedRoomId],
  );

  const handleMouseUp = useCallback(() => {
    stopAutoPan();
    if (onMarqueeMouseUp()) return;
    onHandleMouseUp();
    onVertexMouseUp();
  }, [stopAutoPan, onMarqueeMouseUp, onHandleMouseUp, onVertexMouseUp]);

  const combinedMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (marquee) {
      setHoveredTargetRoomId(null);
      const stage = e.target.getStage();
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const worldX = (pos.x - stage.x()) / stage.scaleX();
          const worldY = (pos.y - stage.y()) / stage.scaleY();
          setMarquee(prev => prev ? { ...prev, endX: worldX, endY: worldY } : null);
        }
      }
      return;
    }
    if (draggingHandle) { setHoveredTargetRoomId(null); handleHandleMouseMove(e); return; }
    if (draggingWall) { setHoveredTargetRoomId(null); handleWallMouseMove(e); return; }
    if (draggingVertex) { setHoveredTargetRoomId(null); handleVertexMouseMove(e); return; }

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    const node: Konva.Node | null = e.target as any;
    const isDraggingNode = typeof (node as any)?.isDragging === 'function' ? (node as any).isDragging() : false;

    if (pendingSpecialRoom && !pendingTargetRoomId && stage && pointer && !isDraggingNode) {
      const worldX = (pointer.x - stage.x()) / stage.scaleX();
      const worldY = (pointer.y - stage.y()) / stage.scaleY();
      let hit: string | null = null;
      for (let i = sortedRoomsForPaint.length - 1; i >= 0; i--) {
        const room = sortedRoomsForPaint[i];
        const { w, h } = boundingSize(room);
        if (worldX >= room.x && worldX <= room.x + w && worldY >= room.y && worldY <= room.y + h) { hit = room.id; break; }
      }
      setHoveredTargetRoomId(hit);
    } else {
      setHoveredTargetRoomId(null);
    }

    if (stage && pointer && isDraggingNode && node !== stage) {
      const nearEdge = pointer.x < EDGE_THRESHOLD || pointer.x > size.width - EDGE_THRESHOLD
        || pointer.y < EDGE_THRESHOLD || pointer.y > size.height - EDGE_THRESHOLD;
      if (nearEdge) ensureAutoPan(); else stopAutoPan();
    } else {
      stopAutoPan();
    }

    handleMouseMove(e);
  }, [marquee, draggingHandle, draggingWall, draggingVertex, handleHandleMouseMove, handleWallMouseMove, handleVertexMouseMove, handleMouseMove, EDGE_THRESHOLD, size, ensureAutoPan, stopAutoPan, dragFromWalls, pendingSpecialRoom, pendingTargetRoomId, sortedRoomsForPaint]);

  const stageClickHandler = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    handleStageClick(e, {
      placingElement: !!placingElement,
      selectedRoomId: selectedRoomId ?? null,
      ghostPos,
      onPlaceElement,
      pendingTargetRoomId,
      onCancelPendingSpecial,
      setSelectedElementId,
    });
  }, [handleStageClick, placingElement, selectedRoomId, ghostPos, onPlaceElement, pendingTargetRoomId, onCancelPendingSpecial, setSelectedElementId]);

  const isDraggingVertex = draggingVertex !== null;
  const isDraggingWall = draggingWall !== null;
  const wallDragCursor: string | undefined = draggingWall
    ? rotatedResizeCursor(
        Math.abs(draggingWall.normalX) < 1e-6 ? 'ns-resize' : Math.abs(draggingWall.normalY) < 1e-6 ? 'ew-resize' : 'move',
        draggingWall.startRotation,
      )
    : undefined;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 relative">
      <Stage
        ref={stageRef}
        width={size.width} height={size.height} scaleX={scale} scaleY={scale}
        x={stagePos.x} y={stagePos.y}
        draggable={!placingElement && !pendingSpecialRoom && !draggingHandle && !isDraggingVertex && !isDraggingWall && !marquee}
        onDragEnd={handleStageDragEnd} onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onClick={stageClickHandler} onMouseMove={combinedMouseMove} onMouseUp={handleMouseUp}
        style={{
          background: canvasColors.stageBg,
          cursor: draggingHandle
            ? rotatedResizeCursor(HANDLE_CURSORS[draggingHandle.handle], draggingHandle.startRoom.rotation ?? 0)
            : wallDragCursor ?? (isDraggingVertex ? 'crosshair' : placingElement || pendingSpecialRoom ? 'crosshair' : marquee || modifierHeld ? 'crosshair' : 'grab'),
        }}
      >
        <CanvasGrid thinLines={grid.thin} thickLines={grid.thick} canvasColors={canvasColors} theme={theme} />
        <Layer>
          {sortedRoomsForPaint.map((room) => (
            <CanvasRoom
              key={room.id} room={room} rooms={rooms}
              selectedRoomId={selectedRoomId} selectedElementId={selectedElementId}
              placingElement={placingElement ?? null} ghostPos={ghostPos}
              draggingHandle={draggingHandle}
              isDraggingVertex={isDraggingVertex} isDraggingWall={isDraggingWall}
              cutRoomId={cutRoomId}
              canvasColors={canvasColors} theme={theme}
              activeDragWalls={dragFromWalls?.roomId === room.id ? dragFromWalls.walls : null}
              selectedWallIndices={room.id === selectedRoomId ? (selectedWallIndices ?? []) : []}
              isMultiSelected={selectedRoomIdsValue.has(room.id) && selectedRoomIdsValue.size > 1}
              multiDragOffset={
                selectedRoomIdsValue.size > 1 && selectedRoomIdsValue.has(room.id) && multiDragDelta
                  && multiDragOriginIdRef.current !== room.id && !room.isFinalized ? multiDragDelta : null
              }
              selectionModifierHeld={modifierHeld}
              onRoomClick={handleRoomClick}
              onRoomDragMove={handleRoomDragMove}
              onRoomDragMovePosition={handleRoomDragMovePosition}
              onSelectRoom={selectRoomForCanvas} onMoveRoom={handleMoveRoom}
              onUpdateRoom={onUpdateRoom} onUpdateElement={onUpdateElement}
              onPlaceElement={onPlaceElement} onSetSelectedElement={setSelectedElementId}
              onSetDraggingHandle={setDraggingHandle}
              onSnapHighlight={setSnapHighlight}
              onDragStartWalls={(roomId, walls) => {
                beginBatch?.();
                setDragFromWalls({ roomId, walls });
                setWizardGaps([]);
                setWizardPreview(null);
                const ids = selectedRoomIdsValue.has(roomId) ? selectedRoomIdsValue : new Set([roomId]);
                draggedRoomIdsRef.current = ids;
                draggedRoomPositionsRef.current = {};
                ids.forEach(id => {
                  const r = rooms.find(room => room.id === id);
                  if (r && !r.isFinalized) draggedRoomPositionsRef.current[id] = { x: r.x, y: r.y };
                });
              }}
              onDragEndRoom={() => { endBatch?.(); setDragFromWalls(null); draggedRoomIdsRef.current = null; }}
              onVertexHandleMouseDown={(vi, wx, wy) => handleVertexHandleMouseDown(room.id, vi, wx, wy)}
              onWallHandleMouseDown={(wi, wx, wy) => handleWallHandleMouseDown(room.id, wi, wx, wy)}
            />
          ))}
          {hoveredTargetRoomId && pendingSpecialRoom && !pendingTargetRoomId && (() => {
            const hr = rooms.find(r => r.id === hoveredTargetRoomId);
            if (!hr) return null;
            const { w, h } = boundingSize(hr);
            return <Rect x={hr.x - 2} y={hr.y - 2} width={w + 4} height={h + 4} fill="rgba(245, 158, 11, 0.12)" stroke="rgba(251, 146, 60, 0.85)" strokeWidth={2} cornerRadius={4} listening={false} />;
          })()}
          {snapHighlight && (() => {
            const r = computeSnapHighlightRect(rooms, snapHighlight);
            if (!r) return null;
            return <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#FF5C1A22" stroke="#FF5C1A" strokeWidth={1} opacity={0.8} listening={false} />;
          })()}
          {wizardPreview && <Line points={wizardPreview.vertices} closed fill="rgba(245, 158, 11, 0.15)" stroke="rgba(245, 158, 11, 0.6)" strokeWidth={1.5} dash={[6, 4]} listening={false} />}
          {cornerFillPreview && <Rect x={cornerFillPreview.fillX} y={cornerFillPreview.fillY} width={cornerFillPreview.fillWpx} height={cornerFillPreview.fillHpx} fill="rgba(59, 130, 246, 0.15)" stroke="rgba(59, 130, 246, 0.6)" strokeWidth={1.5} dash={[6, 4]} listening={false} />}
          {marquee && <Rect x={Math.min(marquee.startX, marquee.endX)} y={Math.min(marquee.startY, marquee.endY)} width={Math.abs(marquee.endX - marquee.startX)} height={Math.abs(marquee.endY - marquee.startY)} fill="rgba(59, 130, 246, 0.08)" stroke="rgba(59, 130, 246, 0.5)" strokeWidth={1} dash={[4, 4]} listening={false} />}
        </Layer>
      </Stage>
      {pendingSpecialRoom && pendingTargetRoomId && (() => {
        const targetRoom = rooms.find(r => r.id === pendingTargetRoomId);
        if (!targetRoom) return null;
        return (
          <div className="shrink-0 w-full flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-t-lg bg-accent text-white text-xs font-medium shadow-lg">
            <span className="text-center">{targetRoom.name} is definitief. Wil je het bewerken om {pendingSpecialRoom.name} te plaatsen?</span>
            <button type="button" className="bg-white text-accent rounded px-3 py-1 text-xs font-semibold ml-3 cursor-pointer" onClick={() => onConfirmPlaceFinalized()}>Ja, bewerken</button>
            <button type="button" className="bg-white/20 text-white rounded px-3 py-1 text-xs ml-2 cursor-pointer" onClick={() => onCancelPlaceFinalized()}>Nee</button>
          </div>
        );
      })()}
      {pendingSpecialRoom && !pendingTargetRoomId && (
        <div className="shrink-0 w-full flex items-center justify-center px-4 py-2 rounded-t-lg bg-accent text-white text-xs font-medium shadow-lg">
          Klik op een kamer om {pendingSpecialRoom.name} hierop te plaatsen — of Esc om te annuleren
        </div>
      )}
      {wizardGaps.length > 0 && !draggingHandle && !isDraggingVertex && !isDraggingWall && !marquee && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ height: size.height }}>
          {selectedSpecialActionTarget ? (
            <WizardWand key={`selected-special-action-${selectedSpecialActionTarget.targetRoomId}-${selectedSpecialActionTarget.wallIndex}`} target={selectedSpecialActionTarget} scale={scale} stagePos={stagePos} viewportSize={{ width: size.width, height: size.height }} onFill={handleWizardFill} onCarve={handleWizardCarve} onHoverStart={handleWizardHoverStart} onHoverEnd={handleWizardHoverEnd} />
          ) : wizardGaps.map((target, i) => (
            <WizardWand key={`${target.targetRoomId}-${target.wallIndex}-${i}`} target={target} scale={scale} stagePos={stagePos} viewportSize={{ width: size.width, height: size.height }} onFill={handleWizardFill} onCarve={handleWizardCarve} onHoverStart={handleWizardHoverStart} onHoverEnd={handleWizardHoverEnd} />
          ))}
        </div>
      )}
      {cornerFills.length > 0 && onAddRoomFromCornerFill && !draggingHandle && !isDraggingVertex && !isDraggingWall && !marquee && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ height: size.height }}>
          {cornerFills.map(fill => (
            <CornerFillWand
              key={fill.id}
              fill={fill}
              scale={scale}
              stagePos={stagePos}
              viewportSize={{ width: size.width, height: size.height }}
              onFill={handleCornerFill}
              onHoverStart={setCornerFillPreview}
              onHoverEnd={() => setCornerFillPreview(null)}
            />
          ))}
        </div>
      )}
      <CanvasToolbar
        rooms={rooms} selectedRoom={selectedRoom} clipboard={clipboard}
        placingElement={!!placingElement} scale={scale} totals={totals}
        canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo}
        onDuplicate={onDuplicate} onCopy={onCopy} onCut={onCut} onPaste={onPaste}
        onZoomIn={() => adjustZoom(SCALE_BY)} onZoomOut={() => adjustZoom(1 / SCALE_BY)}
        onResetZoom={resetZoom}
      />
    </div>
  );
});

export default PlattegrondCanvas;
