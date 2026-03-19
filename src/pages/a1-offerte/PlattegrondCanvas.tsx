import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Stage as KonvaStage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';
import { calcTotalWalls, ensureVertices, syncRoomFromVertices, getDependentRoomsForFinalization } from './types';
import { useTheme } from '../../hooks/useTheme';
import { WallId, DraggingHandle, DraggingVertex, DraggingWall, SCALE_BY, HANDLE_CURSORS, PX_PER_M, PlattegrondCanvasProps, WizardTarget } from './canvas/canvasTypes';
import { wallNormal, projectWorldDeltaToNormalMetres, rotatedResizeCursor } from './canvas/canvasGeometry';
import { computeGridLines, computeHandleDrag, computeGhostPos, computeSnapHighlightRect, snapToRooms, boundingSize, detectWizardTargets, applyWizardExtend, safeWizardDistance, rotateVector2D } from './canvas/canvasUtils';
import { useCanvasStage } from './canvas/useCanvasStage';
import CanvasGrid from './canvas/CanvasGrid';
import CanvasRoom from './canvas/CanvasRoom';
import CanvasToolbar from './canvas/CanvasToolbar';
import WizardWand from './canvas/WizardWand';

const Stage = KonvaStage as unknown as React.ComponentType<any>;

export interface PlattegrondCanvasHandle {
  goToCenter: () => void;
  /** World coords of viewport center; use for spawning new rooms in view. */
  getSpawnPosition: () => { x: number; y: number };
}

const PlattegrondCanvas = forwardRef<PlattegrondCanvasHandle, PlattegrondCanvasProps>(function PlattegrondCanvas({
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
}, ref) {
  const { theme, canvasColors } = useTheme();
  const {
    containerRef,
    stageRef,
    size,
    scale,
    stagePos,
    setStagePos,
    handleWheel,
    adjustZoom,
    resetZoom,
    goToCenter,
    handleStageDragEnd,
  } = useCanvasStage();
  const goToCenterRef = useRef(goToCenter);
  goToCenterRef.current = goToCenter;

  const autoPanFrameRef = useRef<number | null>(null);
  const autoPanActiveRef = useRef(false);
  const stagePosRef = useRef(stagePos);
  const draggedRoomIdsRef = useRef<Set<string> | null>(null);
  const draggedRoomPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    stagePosRef.current = stagePos;
  }, [stagePos]);

  const EDGE_THRESHOLD = 60;
  const SCROLL_SPEED = 2.5;

  const getSpawnPosition = useCallback(() => ({
    x: (size.width / 2 - stagePos.x) / scale,
    y: (size.height / 2 - stagePos.y) / scale,
  }), [size, stagePos, scale]);

  useImperativeHandle(ref, () => ({ goToCenter, getSpawnPosition }), [goToCenter, getSpawnPosition]);

  useEffect(() => {
    goToCenter();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancelPlacing?.(); return; }
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        goToCenterRef.current();
      }
      if (e.key === 'w' || e.key === 'W') {
        if (wizardTargetsRef.current.length > 0) {
          e.preventDefault();
          handleWizardFillRef.current(wizardTargetsRef.current[0]);
        }
      }
      // D = Definitief maken
      if ((e.key === 'd' || e.key === 'D') && selectedRoomId && onUpdateRoom) {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room || room.isFinalized) return;
        e.preventDefault();

        const dependents = getDependentRoomsForFinalization(room, rooms);
        onUpdateRoom(room.id, { isFinalized: true });
        dependents.forEach((dependent) => {
          if (!dependent.isFinalized) onUpdateRoom(dependent.id, { isFinalized: true });
        });
      }
      // B = Bewerken (als een kamer geselecteerd is en definitief is) — hoofdkamer + speciale kamers terug op bewerken
      if ((e.key === 'b' || e.key === 'B') && selectedRoomId && onUpdateRoom) {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (room?.isFinalized) {
          e.preventDefault();
          onUpdateRoom(selectedRoomId, { isFinalized: false });
          const dependents = getDependentRoomsForFinalization(room, rooms);
          dependents.forEach((dependent) => {
            if (dependent.isFinalized) onUpdateRoom(dependent.id, { isFinalized: false });
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancelPlacing, selectedRoomId, rooms, onUpdateRoom]);

  const [ghostPos, setGhostPos] = useState<{ wall: WallId; position: number } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandleRaw] = useState<DraggingHandle>(null);
  const [draggingVertex, setDraggingVertex] = useState<DraggingVertex>(null);
  const [draggingWall, setDraggingWall] = useState<DraggingWall>(null);
  const [snapHighlight, setSnapHighlight] = useState<{ roomId: string; wall: 'top' | 'right' | 'bottom' | 'left' } | null>(null);
  const [dragFromWalls, setDragFromWalls] = useState<{ roomId: string; walls: WallId[] } | null>(null);

  // Keep dragged room positions in sync during drag (for auto-pan compensation)
  if (dragFromWalls && draggedRoomIdsRef.current) {
    const ids = Array.from(draggedRoomIdsRef.current);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const r = rooms.find(room => room.id === id);
      if (r && !r.isFinalized) draggedRoomPositionsRef.current[id] = { x: r.x, y: r.y };
    }
  }

  const [internalSelectedRoomIds, setInternalSelectedRoomIds] = useState<Set<string>>(new Set());
  const selectedRoomIdsValue = selectedRoomIds ?? internalSelectedRoomIds;
  const setSelectedRoomIds = useCallback((ids: Set<string>) => {
    if (onSelectedRoomIdsChange) {
      onSelectedRoomIdsChange(ids);
    } else {
      setInternalSelectedRoomIds(ids);
    }
  }, [onSelectedRoomIdsChange]);
  const [multiDragDelta, setMultiDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const multiDragOriginIdRef = useRef<string | null>(null);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const internalSelectRef = useRef(false);
  const justFinishedDragRef = useRef(false);
  const [modifierHeld, setModifierHeld] = useState(false);
  const [wizardTargets, setWizardTargets] = useState<WizardTarget[]>([]);
  const [wizardPreview, setWizardPreview] = useState<{ vertices: number[] } | null>(null);

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
  }, [selectedRoomId, setSelectedRoomIds]);

  useEffect(() => {
    const roomIds = new Set(rooms.map(r => r.id));
    const filtered = new Set<string>(Array.from(selectedRoomIdsValue).filter(id => roomIds.has(id)));
    if (filtered.size !== selectedRoomIdsValue.size) {
      setSelectedRoomIds(filtered);
    }
  }, [rooms, selectedRoomIdsValue, setSelectedRoomIds]);

  useEffect(() => {
    if (!selectedRoomId) { setWizardTargets([]); return; }
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room || room.isFinalized) { setWizardTargets([]); return; }
    const targets = detectWizardTargets(room, rooms);
    setWizardTargets(targets);
  }, [rooms, selectedRoomId]);

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
  }, [onSelectRoom, setSelectedRoomIds]);

  const handleRoomClick = useCallback((roomId: string, evt: MouseEvent) => {
    if (evt.ctrlKey || evt.metaKey) {
      const clickedRoom = rooms.find(r => r.id === roomId);
      const clickedFinalized = !!clickedRoom?.isFinalized;
      const currentHasFinalized = selectedRoomIdsValue.size > 0 && Array.from(selectedRoomIdsValue).some(rid => {
        const r = rooms.find(r => r.id === rid);
        return r?.isFinalized;
      });

      if (selectedRoomIdsValue.size > 0 && clickedFinalized !== currentHasFinalized) {
        setSelectedRoomIds(new Set([roomId]));
        internalSelectRef.current = true;
        onSelectRoom(roomId);
        return;
      }

      const isInSet = selectedRoomIdsValue.has(roomId);
      if (isInSet) {
        const next = new Set(selectedRoomIdsValue);
        next.delete(roomId);
        const remaining = Array.from(next);
        if (selectedRoomId === roomId && remaining.length === 0) {
          if (shouldConfirmClearRoomSelection?.()) {
            onRequestClearRoomSelectionConfirm?.();
            return;
          }
        }
        setSelectedRoomIds(next);
        if (selectedRoomId === roomId) {
          internalSelectRef.current = true;
          onSelectRoom(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        const next = new Set(selectedRoomIdsValue);
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
  }, [selectedRoomIdsValue, selectedRoomId, rooms, onSelectRoom, selectRoom, shouldConfirmClearRoomSelection, onRequestClearRoomSelectionConfirm]);

  const handleRoomDragMove = useCallback((roomId: string, dx: number, dy: number) => {
    multiDragOriginIdRef.current = roomId;
    setMultiDragDelta({ dx, dy });
  }, []);

  const handleMoveRoom = useCallback((id: string, x: number, y: number) => {
    setMultiDragDelta(null);
    multiDragOriginIdRef.current = null;
    if (selectedRoomIdsValue.size > 1 && selectedRoomIdsValue.has(id) && onMoveRooms) {
      const room = rooms.find(r => r.id === id);
      if (!room) { onMoveRoom(id, x, y); return; }
      const dx = x - room.x;
      const dy = y - room.y;
      const moves = Array.from(selectedRoomIdsValue)
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
  }, [selectedRoomIdsValue, rooms, onMoveRoom, onMoveRooms]);

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

    // Derive new room position by anchoring on an untouched reference vertex so its world
    // position is preserved exactly (correct for all rotation angles).
    const rotDeg = draggingVertex.startRotation || 0;
    const newMaxX = Math.max(...normalizedVerts.map(v => v.x));
    const newMaxY = Math.max(...normalizedVerts.map(v => v.y));
    const newCx = newMaxX * PX_PER_M / 2;
    const newCy = newMaxY * PX_PER_M / 2;

    let newRoomX: number;
    let newRoomY: number;

    const refIdxV = sv.findIndex((_, i) => i !== draggingVertex.vertexIndex);
    if (refIdxV < 0) {
      // Degenerate: no untouched vertex. Fall back to simple bbox-min shift.
      newRoomX = draggingVertex.startRoomPos.x + minX * PX_PER_M;
      newRoomY = draggingVertex.startRoomPos.y + minY * PX_PER_M;
    } else {
      // Old world position of the reference vertex (correct: subtract centre before rotating).
      const refOldRel = rotateVector2D(sv[refIdxV].x * PX_PER_M - startCx, sv[refIdxV].y * PX_PER_M - startCy, rotDeg);
      const refWorldX = draggingVertex.startRoomPos.x + startCx + refOldRel.x;
      const refWorldY = draggingVertex.startRoomPos.y + startCy + refOldRel.y;
      // New local position of same vertex relative to new centre (note: normalizedVerts[refIdxV].x = sv[refIdxV].x - minX).
      const refNewRel = rotateVector2D(normalizedVerts[refIdxV].x * PX_PER_M - newCx, normalizedVerts[refIdxV].y * PX_PER_M - newCy, rotDeg);
      // new_pivot + refNewRel = refWorld → new_pivot = refWorld - refNewRel
      newRoomX = refWorldX - refNewRel.x - newCx;
      newRoomY = refWorldY - refNewRel.y - newCy;
    }

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

  const handleWallMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!draggingWall || !onUpdateRoom) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const worldX = (pos.x - stage.x()) / stage.scaleX();
    const worldY = (pos.y - stage.y()) / stage.scaleY();

    const dwx = worldX - draggingWall.startWorldPos.x;
    const dwy = worldY - draggingWall.startWorldPos.y;
    const along = projectWorldDeltaToNormalMetres(
      { x: dwx, y: dwy },
      draggingWall.startRotation,
      draggingWall.normalX,
      draggingWall.normalY,
    );
    const snapM = 0.05;
    const delta = Math.round(along / snapM) * snapM;

    const sv = draggingWall.startVertices;
    const n = sv.length;
    const wi = draggingWall.wallIndex;
    const j = (wi + 1) % n;
    const nx = draggingWall.normalX;
    const ny = draggingWall.normalY;

    const newVerts = sv.map((v, i) =>
      i === wi || i === j ? { x: v.x + nx * delta, y: v.y + ny * delta } : { ...v },
    );

    const minX = Math.min(...newVerts.map(v => v.x));
    const minY = Math.min(...newVerts.map(v => v.y));
    const normalizedVerts = newVerts.map(v => ({ x: v.x - minX, y: v.y - minY }));

    // Derive new room position by anchoring on an untouched reference vertex (correct for all rotations).
    const rotDegW = draggingWall.startRotation || 0;
    const svMaxX = Math.max(...sv.map(v => v.x)); // sv is normalized so min=0
    const svMaxY = Math.max(...sv.map(v => v.y));
    const startCxW = svMaxX * PX_PER_M / 2;
    const startCyW = svMaxY * PX_PER_M / 2;
    const newMaxXW = Math.max(...normalizedVerts.map(v => v.x));
    const newMaxYW = Math.max(...normalizedVerts.map(v => v.y));
    const newCxW = newMaxXW * PX_PER_M / 2;
    const newCyW = newMaxYW * PX_PER_M / 2;

    let newRoomX: number;
    let newRoomY: number;

    const refIdxW = sv.findIndex((_, i) => i !== wi && i !== j);
    if (refIdxW < 0) {
      newRoomX = draggingWall.startRoomPos.x + minX * PX_PER_M;
      newRoomY = draggingWall.startRoomPos.y + minY * PX_PER_M;
    } else {
      const refOldRelW = rotateVector2D(sv[refIdxW].x * PX_PER_M - startCxW, sv[refIdxW].y * PX_PER_M - startCyW, rotDegW);
      const refWorldXW = draggingWall.startRoomPos.x + startCxW + refOldRelW.x;
      const refWorldYW = draggingWall.startRoomPos.y + startCyW + refOldRelW.y;
      const refNewRelW = rotateVector2D(normalizedVerts[refIdxW].x * PX_PER_M - newCxW, normalizedVerts[refIdxW].y * PX_PER_M - newCyW, rotDegW);
      newRoomX = refWorldXW - refNewRelW.x - newCxW;
      newRoomY = refWorldYW - refNewRelW.y - newCyW;
    }

    const synced = syncRoomFromVertices(normalizedVerts);
    onUpdateRoom(draggingWall.roomId, {
      x: newRoomX,
      y: newRoomY,
      vertices: normalizedVerts,
      length: synced.length,
      width: synced.width,
      wallLengths: synced.wallLengths,
    });
  }, [draggingWall, onUpdateRoom]);

  const stopAutoPan = useCallback(() => {
    if (autoPanFrameRef.current !== null) {
      cancelAnimationFrame(autoPanFrameRef.current);
      autoPanFrameRef.current = null;
    }
    autoPanActiveRef.current = false;
  }, []);

  const handleMouseUp = useCallback(() => {
    stopAutoPan();
    if (marquee) {
      const left = Math.min(marquee.startX, marquee.endX);
      const right = Math.max(marquee.startX, marquee.endX);
      const top = Math.min(marquee.startY, marquee.endY);
      const bottom = Math.max(marquee.startY, marquee.endY);

      const currentHasFinalized = Array.from(selectedRoomIdsValue).some(rid => {
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

      if (newSelection.size > 0) {
        setSelectedRoomIds(newSelection);
        const firstId = Array.from(newSelection)[0];
        internalSelectRef.current = true;
        onSelectRoom(firstId);
      } else {
        if (shouldConfirmClearRoomSelection?.()) {
          onRequestClearRoomSelectionConfirm?.();
        } else {
          setSelectedRoomIds(newSelection);
          internalSelectRef.current = true;
          onSelectRoom(null);
        }
      }
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
      setMarquee(null);
      return;
    }
    if (draggingHandle) {
      const roomId = draggingHandle.roomId;
      const room = rooms.find(r => r.id === roomId);
      if (room && onUpdateRoom) {
        const snapped = snapToRooms(roomId, room.x, room.y, rooms);
        if (snapped.x !== room.x || snapped.y !== room.y) {
          flushSync(() => {
            onUpdateRoom(roomId, { x: snapped.x, y: snapped.y });
          });
        }
      }
      endBatch?.();
      setDraggingHandleRaw(null);
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
    }
    if (draggingVertex) {
      const roomId = draggingVertex.roomId;
      const room = rooms.find(r => r.id === roomId);
      if (room && onUpdateRoom) {
        const snapped = snapToRooms(roomId, room.x, room.y, rooms);
        if (snapped.x !== room.x || snapped.y !== room.y) {
          flushSync(() => {
            onUpdateRoom(roomId, { x: snapped.x, y: snapped.y });
          });
        }
      }
      endBatch?.();
      setDraggingVertex(null);
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
    }
    if (draggingWall) {
      const roomId = draggingWall.roomId;
      const room = rooms.find(r => r.id === roomId);
      if (room && onUpdateRoom) {
        const snapped = snapToRooms(roomId, room.x, room.y, rooms);
        if (snapped.x !== room.x || snapped.y !== room.y) {
          flushSync(() => {
            onUpdateRoom(roomId, { x: snapped.x, y: snapped.y });
          });
        }
      }
      endBatch?.();
      setDraggingWall(null);
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
    }
  }, [marquee, draggingHandle, draggingVertex, draggingWall, endBatch, rooms, onUpdateRoom, onSelectRoom, stopAutoPan, selectedRoomIdsValue, setSelectedRoomIds, shouldConfirmClearRoomSelection, onRequestClearRoomSelectionConfirm]);

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

  const handleWallHandleMouseDown = useCallback((roomId: string, wallIndex: number, worldX: number, worldY: number) => {
    beginBatch?.();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const startVertices = ensureVertices(room).map(v => ({ ...v }));
    const n = startVertices.length;
    if (wallIndex < 0 || wallIndex >= n) return;
    const v1 = startVertices[wallIndex];
    const v2 = startVertices[(wallIndex + 1) % n];
    const { nx, ny } = wallNormal(v1, v2);
    setDraggingWall({
      roomId,
      wallIndex,
      normalX: nx,
      normalY: ny,
      startWorldPos: { x: worldX, y: worldY },
      startVertices,
      startRoomPos: { x: room.x, y: room.y },
      startRotation: room.rotation || 0,
    });
  }, [rooms, beginBatch]);

  const handleWizardFill = useCallback((targetInfo: WizardTarget) => {
    if (!onUpdateRoom) return;
    const targetRoom = rooms.find(r => r.id === targetInfo.roomId);
    if (!targetRoom) return;

    const safeDist = safeWizardDistance(targetRoom, targetInfo, rooms);
    if (safeDist <= 0) return;

    const safeTarget: WizardTarget = safeDist < targetInfo.targetDistance
      ? { ...targetInfo, targetDistance: safeDist }
      : targetInfo;

    beginBatch?.();
    const fill = applyWizardExtend(targetRoom, safeTarget);
    const updatedRoom = { ...targetRoom, ...fill };
    const updatedRooms = rooms.map(r => r.id === targetRoom.id ? updatedRoom : r);
    const snapped = snapToRooms(targetRoom.id, fill.x, fill.y, updatedRooms);
    flushSync(() => {
      onUpdateRoom(targetRoom.id, {
        vertices: fill.vertices,
        x: snapped.x,
        y: snapped.y,
        length: fill.length,
        width: fill.width,
        wallLengths: fill.wallLengths,
      });
    });
    endBatch?.();
    setWizardPreview(null);
  }, [rooms, onUpdateRoom, beginBatch, endBatch]);

  const wizardTargetsRef = useRef(wizardTargets);
  wizardTargetsRef.current = wizardTargets;
  const handleWizardFillRef = useRef(handleWizardFill);
  handleWizardFillRef.current = handleWizardFill;

  const handleWizardHoverStart = useCallback((targetInfo: WizardTarget) => {
    const targetRoom = rooms.find(r => r.id === targetInfo.roomId);
    if (!targetRoom) return;
    const safeDist = safeWizardDistance(targetRoom, targetInfo, rooms);
    if (safeDist <= 0) return;
    const safeTarget: WizardTarget = safeDist < targetInfo.targetDistance
      ? { ...targetInfo, targetDistance: safeDist }
      : targetInfo;
    const fill = applyWizardExtend(targetRoom, safeTarget);
    const pts = fill.vertices.flatMap(v => [fill.x + v.x * PX_PER_M, fill.y + v.y * PX_PER_M]);
    setWizardPreview({ vertices: pts });
  }, [rooms]);

  const handleWizardHoverEnd = useCallback(() => {
    setWizardPreview(null);
  }, []);

  const autoPanStep = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      stopAutoPan();
      return;
    }
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      stopAutoPan();
      return;
    }

    const { width, height } = size;
    let dx = 0;
    let dy = 0;

    if (pointer.x < EDGE_THRESHOLD) {
      dx = 1 - pointer.x / EDGE_THRESHOLD;
    } else if (pointer.x > width - EDGE_THRESHOLD) {
      dx = -1 + (width - pointer.x) / EDGE_THRESHOLD;
    }

    if (pointer.y < EDGE_THRESHOLD) {
      dy = 1 - pointer.y / EDGE_THRESHOLD;
    } else if (pointer.y > height - EDGE_THRESHOLD) {
      dy = -1 + (height - pointer.y) / EDGE_THRESHOLD;
    }

    let intensity = Math.max(Math.abs(dx), Math.abs(dy));
    if (!intensity) {
      stopAutoPan();
      return;
    }
    intensity = Math.pow(intensity, 1.2);

    const speed = (SCROLL_SPEED * intensity) / scale;
    const stageDx = dx * speed;
    const stageDy = dy * speed;

    const prevStage = stagePosRef.current;
    const newStageX = prevStage.x + stageDx;
    const newStageY = prevStage.y + stageDy;
    stagePosRef.current = { x: newStageX, y: newStageY };
    setStagePos({ x: newStageX, y: newStageY });

    // When auto-panning during a room drag, move the room(s) in world coords so they stay
    // under the cursor. Stage moved right => content shifted right on screen => subtract
    // world delta from room position to keep it under the same screen point.
    const draggedIds = draggedRoomIdsRef.current;
    if (draggedIds && (onMoveRoom || onMoveRooms)) {
      const worldDx = stageDx / scale;
      const worldDy = stageDy / scale;
      const moves: { id: string; x: number; y: number }[] = [];
      const ids = Array.from(draggedIds);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const pos = draggedRoomPositionsRef.current[id];
        if (pos) {
          const newX = pos.x - worldDx;
          const newY = pos.y - worldDy;
          draggedRoomPositionsRef.current[id] = { x: newX, y: newY };
          moves.push({ id, x: newX, y: newY });
        }
      }
      if (moves.length > 0) {
        if (moves.length === 1) {
          onMoveRoom?.(moves[0].id, moves[0].x, moves[0].y);
        } else {
          onMoveRooms?.(moves);
        }
      }
    }

    autoPanFrameRef.current = requestAnimationFrame(autoPanStep);
  }, [EDGE_THRESHOLD, SCROLL_SPEED, size, scale, setStagePos, stageRef, stopAutoPan, onMoveRoom, onMoveRooms]);

  const ensureAutoPan = useCallback(() => {
    if (autoPanActiveRef.current) return;
    autoPanActiveRef.current = true;
    autoPanStep();
  }, [autoPanStep]);

  /** Edge-based pan during room drag: driven from room onDragMove. Uses current Konva room position so the room stays under the cursor. */
  const handleRoomDragMovePosition = useCallback((pointerX: number, pointerY: number, roomWorldX: number, roomWorldY: number) => {
    if (dragFromWalls) {
      draggedRoomPositionsRef.current[dragFromWalls.roomId] = { x: roomWorldX, y: roomWorldY };
    }
    const nearH = pointerX < EDGE_THRESHOLD || pointerX > size.width - EDGE_THRESHOLD;
    const nearV = pointerY < EDGE_THRESHOLD || pointerY > size.height - EDGE_THRESHOLD;
    if (nearH || nearV) {
      ensureAutoPan();
    } else {
      stopAutoPan();
    }
  }, [EDGE_THRESHOLD, size.width, size.height, ensureAutoPan, stopAutoPan, dragFromWalls]);

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
    if (draggingWall) { handleWallMouseMove(e); return; }
    if (draggingVertex) { handleVertexMouseMove(e); return; }

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    const node: Konva.Node | null = e.target as any;
    const isDraggingNode = typeof (node as any)?.isDragging === 'function' ? (node as any).isDragging() : false;

    if (stage && pointer && isDraggingNode && node !== stage) {
      const nearHorizontalEdge =
        pointer.x < EDGE_THRESHOLD || pointer.x > size.width - EDGE_THRESHOLD;
      const nearVerticalEdge =
        pointer.y < EDGE_THRESHOLD || pointer.y > size.height - EDGE_THRESHOLD;

      if (nearHorizontalEdge || nearVerticalEdge) {
        ensureAutoPan();
      } else {
        stopAutoPan();
      }
    } else {
      stopAutoPan();
    }

    handleMouseMove(e);
  }, [
    marquee,
    draggingHandle,
    draggingWall,
    draggingVertex,
    handleHandleMouseMove,
    handleWallMouseMove,
    handleVertexMouseMove,
    handleMouseMove,
    EDGE_THRESHOLD,
    size,
    ensureAutoPan,
    stopAutoPan,
    dragFromWalls,
  ]);

  const isDraggingVertex = draggingVertex !== null;
  const isDraggingWall = draggingWall !== null;

  const wallDragCursor: string | undefined = draggingWall
    ? rotatedResizeCursor(
        Math.abs(draggingWall.normalX) < 1e-6
          ? 'ns-resize'
          : Math.abs(draggingWall.normalY) < 1e-6
            ? 'ew-resize'
            : 'move',
        draggingWall.startRotation,
      )
    : undefined;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 relative">
      <Stage
        ref={stageRef}
        width={size.width} height={size.height} scaleX={scale} scaleY={scale}
        x={stagePos.x} y={stagePos.y}
        draggable={!placingElement && !draggingHandle && !isDraggingVertex && !isDraggingWall && !marquee}
        onDragEnd={handleStageDragEnd} onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onClick={handleStageClick} onMouseMove={combinedMouseMove} onMouseUp={handleMouseUp}
        style={{
          background: canvasColors.stageBg,
          cursor: draggingHandle
            ? rotatedResizeCursor(
                HANDLE_CURSORS[draggingHandle.handle],
                draggingHandle.startRoom.rotation ?? 0,
              )
            : wallDragCursor
              ? wallDragCursor
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
              isDraggingWall={isDraggingWall}
              cutRoomId={cutRoomId}
              canvasColors={canvasColors} theme={theme}
              activeDragWalls={dragFromWalls?.roomId === room.id ? dragFromWalls.walls : null}
              selectedWallIndices={room.id === selectedRoomId ? (selectedWallIndices ?? []) : []}
              isMultiSelected={selectedRoomIdsValue.has(room.id) && selectedRoomIdsValue.size > 1}
              multiDragOffset={
                selectedRoomIdsValue.size > 1 && selectedRoomIdsValue.has(room.id) && multiDragDelta
                  && multiDragOriginIdRef.current !== room.id && !room.isFinalized
                  ? multiDragDelta
                  : null
              }
              selectionModifierHeld={modifierHeld}
              onRoomClick={handleRoomClick}
              onRoomDragMove={handleRoomDragMove}
              onRoomDragMovePosition={handleRoomDragMovePosition}
              onSelectRoom={selectRoom} onMoveRoom={handleMoveRoom}
              onUpdateRoom={onUpdateRoom} onUpdateElement={onUpdateElement}
              onPlaceElement={onPlaceElement} onSetSelectedElement={setSelectedElementId}
              onSetDraggingHandle={setDraggingHandle}
              onSnapHighlight={setSnapHighlight}
              onDragStartWalls={(roomId, walls) => {
                beginBatch?.();
                setDragFromWalls({ roomId, walls });
                setWizardTargets([]);
                setWizardPreview(null);
                const ids = selectedRoomIdsValue.has(roomId) ? selectedRoomIdsValue : new Set([roomId]);
                draggedRoomIdsRef.current = ids;
                draggedRoomPositionsRef.current = {};
                ids.forEach(id => {
                  const r = rooms.find(room => room.id === id);
                  if (r && !r.isFinalized) draggedRoomPositionsRef.current[id] = { x: r.x, y: r.y };
                });
              }}
              onDragEndRoom={() => {
                endBatch?.();
                setDragFromWalls(null);
                draggedRoomIdsRef.current = null;
              }}
              onVertexHandleMouseDown={(vi, wx, wy) => handleVertexHandleMouseDown(room.id, vi, wx, wy)}
              onWallHandleMouseDown={(wi, wx, wy) => handleWallHandleMouseDown(room.id, wi, wx, wy)}
            />
          ))}
          {snapHighlight && (() => {
            const r = computeSnapHighlightRect(rooms, snapHighlight);
            if (!r) return null;
            return <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#FF5C1A22" stroke="#FF5C1A" strokeWidth={1} opacity={0.8} listening={false} />;
          })()}
          {wizardPreview && (
            <Line
              points={wizardPreview.vertices}
              closed
              fill="rgba(245, 158, 11, 0.15)"
              stroke="rgba(245, 158, 11, 0.6)"
              strokeWidth={1.5}
              dash={[6, 4]}
              listening={false}
            />
          )}
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
      {wizardTargets.length > 0 && !draggingHandle && !isDraggingVertex && !isDraggingWall && !marquee && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ height: size.height }}>
          {wizardTargets.map((target, i) => (
            <WizardWand
              key={`${target.targetRoomId}-${target.wallIndex}-${i}`}
              target={target}
              scale={scale}
              stagePos={stagePos}
              onFill={handleWizardFill}
              onHoverStart={handleWizardHoverStart}
              onHoverEnd={handleWizardHoverEnd}
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
