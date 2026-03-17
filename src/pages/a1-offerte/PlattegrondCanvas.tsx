import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef, useMemo } from 'react';
import { Stage as KonvaStage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { calcTotalWalls, ensureVertices, syncRoomFromVertices } from './types';
import { useTheme } from '../../hooks/useTheme';
import { WallId, DraggingHandle, DraggingVertex, SCALE_BY, HANDLE_CURSORS, PX_PER_M, PlattegrondCanvasProps } from './canvas/canvasTypes';
import { computeGridLines, computeHandleDrag, computeGhostPos, computeSnapHighlightRect, snapToRooms, boundingSize } from './canvas/canvasUtils';
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
  onMoveRooms,
  beginBatch, endBatch,
  selectedWallIndices,
  canUndo, canRedo, onUndo, onRedo,
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

  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [multiDragDelta, setMultiDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const multiDragOriginIdRef = useRef<string | null>(null);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const internalSelectRef = useRef(false);
  const justFinishedDragRef = useRef(false);
  const [modifierHeld, setModifierHeld] = useState(false);

  const setDraggingHandle = useCallback((handle: DraggingHandle) => {
    if (handle && !draggingHandle) beginBatch?.();
    setDraggingHandleRaw(handle);
  }, [draggingHandle, beginBatch]);

  useEffect(() => {
    if (!placingElement) setGhostPos(null);
  }, [placingElement]);

  useEffect(() => {
    const update = (e: KeyboardEvent) => setModifierHeld(e.ctrlKey || e.metaKey || e.shiftKey);
    const blur = () => setModifierHeld(false);
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', update);
      window.removeEventListener('keyup', update);
      window.removeEventListener('blur', blur);
    };
  }, []);

  useEffect(() => {
    if (internalSelectRef.current) {
      internalSelectRef.current = false;
      return;
    }
    setSelectedRoomIds(selectedRoomId ? new Set([selectedRoomId]) : new Set());
  }, [selectedRoomId]);

  useEffect(() => {
    const roomIds = new Set(rooms.map(r => r.id));
    setSelectedRoomIds(prev => {
      const next = new Set(Array.from(prev).filter(id => roomIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rooms]);

  const totals = rooms.reduce(
    (acc, r) => ({ floor: acc.floor + r.length * r.width, walls: acc.walls + calcTotalWalls(r), ceiling: acc.ceiling + r.length * r.width }),
    { floor: 0, walls: 0, ceiling: 0 },
  );

  const grid = computeGridLines(size, stagePos, scale);

  const selectRoom = useCallback((id: string | null) => {
    setSelectedRoomIds(id ? new Set([id]) : new Set());
    setMultiDragDelta(null);
    multiDragOriginIdRef.current = null;
    internalSelectRef.current = true;
    onSelectRoom(id);
  }, [onSelectRoom]);

  const handleRoomClick = useCallback((roomId: string, evt: MouseEvent) => {
    if (evt.ctrlKey || evt.metaKey) {
      const clickedRoom = rooms.find(r => r.id === roomId);
      const clickedFinalized = !!clickedRoom?.isFinalized;
      const currentHasFinalized = selectedRoomIds.size > 0 && Array.from(selectedRoomIds).some(rid => {
        const r = rooms.find(r => r.id === rid);
        return r?.isFinalized;
      });

      if (selectedRoomIds.size > 0 && clickedFinalized !== currentHasFinalized) {
        setSelectedRoomIds(new Set([roomId]));
        internalSelectRef.current = true;
        onSelectRoom(roomId);
        return;
      }

      const isInSet = selectedRoomIds.has(roomId);
      if (isInSet) {
        const next = new Set(selectedRoomIds);
        next.delete(roomId);
        setSelectedRoomIds(next);
        if (selectedRoomId === roomId) {
          const remaining = Array.from(next);
          internalSelectRef.current = true;
          onSelectRoom(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        const next = new Set(selectedRoomIds);
        next.add(roomId);
        if (selectedRoomId) next.add(selectedRoomId);
        setSelectedRoomIds(next);
        internalSelectRef.current = true;
        onSelectRoom(roomId);
      }
      return;
    }

    if (evt.shiftKey && selectedRoomId) {
      const primaryRoom = rooms.find(r => r.id === selectedRoomId);
      const primaryFinalized = !!primaryRoom?.isFinalized;
      const startIdx = rooms.findIndex(r => r.id === selectedRoomId);
      const endIdx = rooms.findIndex(r => r.id === roomId);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = new Set(
          rooms.slice(from, to + 1)
            .filter(r => !!r.isFinalized === primaryFinalized)
            .map(r => r.id)
        );
        setSelectedRoomIds(rangeIds);
        internalSelectRef.current = true;
        onSelectRoom(roomId);
      }
      return;
    }

    selectRoom(roomId);
  }, [selectedRoomIds, selectedRoomId, rooms, onSelectRoom, selectRoom]);

  const handleRoomDragMove = useCallback((roomId: string, dx: number, dy: number) => {
    multiDragOriginIdRef.current = roomId;
    setMultiDragDelta({ dx, dy });
  }, []);

  const handleMoveRoom = useCallback((id: string, x: number, y: number) => {
    setMultiDragDelta(null);
    multiDragOriginIdRef.current = null;
    if (selectedRoomIds.size > 1 && selectedRoomIds.has(id) && onMoveRooms) {
      const room = rooms.find(r => r.id === id);
      if (!room) { onMoveRoom(id, x, y); return; }
      const dx = x - room.x;
      const dy = y - room.y;
      const moves = Array.from(selectedRoomIds)
        .map(rid => {
          const r = rooms.find(r => r.id === rid);
          if (!r || r.isFinalized) return null;
          return { id: rid, x: rid === id ? x : r.x + dx, y: rid === id ? y : r.y + dy };
        })
        .filter((m): m is { id: string; x: number; y: number } => m !== null);
      if (moves.length > 0) onMoveRooms(moves);
    } else {
      onMoveRoom(id, x, y);
    }
  }, [selectedRoomIds, rooms, onMoveRoom, onMoveRooms]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if ((e.evt.ctrlKey || e.evt.metaKey) && e.target === e.target.getStage()) {
      const stage = e.target.getStage()!;
      stage.draggable(false);
      const pos = stage.getPointerPosition()!;
      const worldX = (pos.x - stage.x()) / stage.scaleX();
      const worldY = (pos.y - stage.y()) / stage.scaleY();
      setMarquee({ startX: worldX, startY: worldY, endX: worldX, endY: worldY });
    }
  }, []);

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
    if (justFinishedDragRef.current) return;
    if (placingElement && selectedRoomId && ghostPos) { onPlaceElement?.(selectedRoomId, ghostPos.wall, ghostPos.position); return; }
    setSelectedElementId(null);
    if (e.target === e.target.getStage()) selectRoom(null);
  }, [placingElement, selectedRoomId, ghostPos, onPlaceElement, selectRoom]);

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
    if (marquee) {
      const left = Math.min(marquee.startX, marquee.endX);
      const right = Math.max(marquee.startX, marquee.endX);
      const top = Math.min(marquee.startY, marquee.endY);
      const bottom = Math.max(marquee.startY, marquee.endY);

      const currentHasFinalized = Array.from(selectedRoomIds).some(rid => {
        const r = rooms.find(r => r.id === rid);
        return r?.isFinalized;
      });

      const newSelection = new Set<string>();
      for (const room of rooms) {
        if (currentHasFinalized && !room.isFinalized) continue;
        if (!currentHasFinalized && room.isFinalized) continue;
        const { w, h } = boundingSize(room);
        if (room.x < right && room.x + w > left && room.y < bottom && room.y + h > top) {
          newSelection.add(room.id);
        }
      }

      setSelectedRoomIds(newSelection);
      if (newSelection.size > 0) {
        const firstId = Array.from(newSelection)[0];
        internalSelectRef.current = true;
        onSelectRoom(firstId);
      } else {
        internalSelectRef.current = true;
        onSelectRoom(null);
      }
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
      setMarquee(null);
      return;
    }
    if (draggingHandle) {
      const roomId = draggingHandle.roomId;
      endBatch?.();
      setDraggingHandleRaw(null);
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
      const room = rooms.find(r => r.id === roomId);
      if (room && onUpdateRoom) {
        const snapped = snapToRooms(roomId, room.x, room.y, rooms);
        if (snapped.x !== room.x || snapped.y !== room.y) {
          onUpdateRoom(roomId, { x: snapped.x, y: snapped.y });
        }
      }
    }
    if (draggingVertex) {
      const roomId = draggingVertex.roomId;
      endBatch?.();
      setDraggingVertex(null);
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
      const room = rooms.find(r => r.id === roomId);
      if (room && onUpdateRoom) {
        const snapped = snapToRooms(roomId, room.x, room.y, rooms);
        if (snapped.x !== room.x || snapped.y !== room.y) {
          onUpdateRoom(roomId, { x: snapped.x, y: snapped.y });
        }
      }
    }
  }, [marquee, draggingHandle, draggingVertex, endBatch, rooms, onUpdateRoom, onSelectRoom]);

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
    if (marquee) {
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
    if (draggingHandle) { handleHandleMouseMove(e); return; }
    if (draggingVertex) { handleVertexMouseMove(e); return; }
    handleMouseMove(e);
  }, [marquee, draggingHandle, draggingVertex, handleHandleMouseMove, handleVertexMouseMove, handleMouseMove]);

  const isDraggingVertex = draggingVertex !== null;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
      <Stage
        width={size.width} height={size.height} scaleX={scale} scaleY={scale}
        x={stagePos.x} y={stagePos.y}
        draggable={!placingElement && !draggingHandle && !isDraggingVertex && !marquee}
        onDragEnd={handleStageDragEnd} onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onClick={handleStageClick} onMouseMove={combinedMouseMove} onMouseUp={handleMouseUp}
        style={{
          background: canvasColors.stageBg,
          cursor: draggingHandle
            ? HANDLE_CURSORS[draggingHandle.handle]
            : isDraggingVertex
              ? 'crosshair'
              : placingElement
                ? 'crosshair'
                : marquee || modifierHeld
                  ? 'crosshair'
                  : 'grab',
        }}
      >
        <CanvasGrid thinLines={grid.thin} thickLines={grid.thick} canvasColors={canvasColors} theme={theme} />
        <Layer>
          {useMemo(() => [...rooms].sort((a, b) =>
            a.id === selectedRoomId ? 1 : b.id === selectedRoomId ? -1 : 0
          ), [rooms, selectedRoomId]).map((room) => (
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
              isMultiSelected={selectedRoomIds.has(room.id) && selectedRoomIds.size > 1}
              multiDragOffset={
                selectedRoomIds.size > 1 && selectedRoomIds.has(room.id) && multiDragDelta
                  && multiDragOriginIdRef.current !== room.id && !room.isFinalized
                  ? multiDragDelta
                  : null
              }
              selectionModifierHeld={modifierHeld}
              onRoomClick={handleRoomClick}
              onRoomDragMove={handleRoomDragMove}
              onSelectRoom={selectRoom} onMoveRoom={handleMoveRoom}
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
          {marquee && (
            <Rect
              x={Math.min(marquee.startX, marquee.endX)}
              y={Math.min(marquee.startY, marquee.endY)}
              width={Math.abs(marquee.endX - marquee.startX)}
              height={Math.abs(marquee.endY - marquee.startY)}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="rgba(59, 130, 246, 0.5)"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
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
