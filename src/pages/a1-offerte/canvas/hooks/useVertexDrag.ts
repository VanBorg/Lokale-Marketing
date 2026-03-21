import { useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Konva from 'konva';
import type { Room } from '../../types';
import { ensureVertices, syncRoomFromVertices } from '../../types';
import type { DraggingVertex, DraggingWall } from '../canvasTypes';
import { PX_PER_M } from '../canvasTypes';
import { wallNormal, projectWorldDeltaToNormalMetres } from '../canvasGeometry';
import { rotateVector2D } from '../wallSegments';
import { snapToRooms } from '../canvasSnapping';

interface UseVertexDragArgs {
  rooms: Room[];
  onUpdateRoom?: (id: string, updates: Partial<Room>) => void;
  beginBatch?: () => void;
  endBatch?: () => void;
  justFinishedDragRef: React.MutableRefObject<boolean>;
}

export function useVertexDrag({ rooms, onUpdateRoom, beginBatch, endBatch, justFinishedDragRef }: UseVertexDragArgs) {
  const [draggingVertex, setDraggingVertex] = useState<DraggingVertex>(null);
  const [draggingWall, setDraggingWall] = useState<DraggingWall>(null);

  const handleVertexMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!draggingVertex || !onUpdateRoom) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const worldX = (pos.x - stage.x()) / stage.scaleX();
    const worldY = (pos.y - stage.y()) / stage.scaleY();

    const sv = draggingVertex.startVertices;
    const minVX = Math.min(...sv.map(v => v.x));
    const maxVX = Math.max(...sv.map(v => v.x));
    const minVY = Math.min(...sv.map(v => v.y));
    const maxVY = Math.max(...sv.map(v => v.y));
    const startW = (maxVX - minVX) * PX_PER_M;
    const startH = (maxVY - minVY) * PX_PER_M;
    const startCx = startW / 2;
    const startCy = startH / 2;

    const rot = draggingVertex.startRotation * Math.PI / 180;
    const lx = worldX - (draggingVertex.startRoomPos.x + startCx);
    const ly = worldY - (draggingVertex.startRoomPos.y + startCy);
    const cosA = Math.cos(-rot);
    const sinA = Math.sin(-rot);
    const ux = lx * cosA - ly * sinA + startCx;
    const uy = lx * sinA + ly * cosA + startCy;

    const snapM = 0.05;
    const newMX = Math.round((ux / PX_PER_M) / snapM) * snapM;
    const newMY = Math.round((uy / PX_PER_M) / snapM) * snapM;

    const newVerts = sv.map((v, i) =>
      i === draggingVertex.vertexIndex ? { x: newMX, y: newMY } : { ...v }
    );

    const minX = Math.min(...newVerts.map(v => v.x));
    const minY = Math.min(...newVerts.map(v => v.y));
    const normalizedVerts = newVerts.map(v => ({ x: v.x - minX, y: v.y - minY }));

    const rotDeg = draggingVertex.startRotation || 0;
    const newMaxX = Math.max(...normalizedVerts.map(v => v.x));
    const newMaxY = Math.max(...normalizedVerts.map(v => v.y));
    const newCx = newMaxX * PX_PER_M / 2;
    const newCy = newMaxY * PX_PER_M / 2;

    let newRoomX: number;
    let newRoomY: number;

    const refIdxV = sv.findIndex((_, i) => i !== draggingVertex.vertexIndex);
    if (refIdxV < 0) {
      newRoomX = draggingVertex.startRoomPos.x + minX * PX_PER_M;
      newRoomY = draggingVertex.startRoomPos.y + minY * PX_PER_M;
    } else {
      const refOldRel = rotateVector2D(sv[refIdxV].x * PX_PER_M - startCx, sv[refIdxV].y * PX_PER_M - startCy, rotDeg);
      const refWorldX = draggingVertex.startRoomPos.x + startCx + refOldRel.x;
      const refWorldY = draggingVertex.startRoomPos.y + startCy + refOldRel.y;
      const refNewRel = rotateVector2D(normalizedVerts[refIdxV].x * PX_PER_M - newCx, normalizedVerts[refIdxV].y * PX_PER_M - newCy, rotDeg);
      newRoomX = refWorldX - refNewRel.x - newCx;
      newRoomY = refWorldY - refNewRel.y - newCy;
    }

    const synced = syncRoomFromVertices(normalizedVerts);
    onUpdateRoom(draggingVertex.roomId, {
      x: newRoomX, y: newRoomY,
      vertices: normalizedVerts,
      length: synced.length, width: synced.width, wallLengths: synced.wallLengths,
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

    const rotDegW = draggingWall.startRotation || 0;
    const svMaxX = Math.max(...sv.map(v => v.x));
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
      x: newRoomX, y: newRoomY,
      vertices: normalizedVerts,
      length: synced.length, width: synced.width, wallLengths: synced.wallLengths,
    });
  }, [draggingWall, onUpdateRoom]);

  const handleVertexHandleMouseDown = useCallback((roomId: string, vertexIndex: number, worldX: number, worldY: number) => {
    beginBatch?.();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const startVertices = ensureVertices(room);
    setDraggingVertex({
      roomId, vertexIndex,
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
      roomId, wallIndex,
      normalX: nx, normalY: ny,
      startWorldPos: { x: worldX, y: worldY },
      startVertices,
      startRoomPos: { x: room.x, y: room.y },
      startRotation: room.rotation || 0,
    });
  }, [rooms, beginBatch]);

  const onVertexMouseUp = useCallback(() => {
    let handled = false;
    if (draggingVertex) {
      const roomId = draggingVertex.roomId;
      const room = rooms.find(r => r.id === roomId);
      if (room && onUpdateRoom) {
        const snapped = snapToRooms(roomId, room.x, room.y, rooms);
        if (snapped.x !== room.x || snapped.y !== room.y) {
          flushSync(() => { onUpdateRoom(roomId, { x: snapped.x, y: snapped.y }); });
        }
      }
      endBatch?.();
      setDraggingVertex(null);
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
      handled = true;
    }
    if (draggingWall) {
      const roomId = draggingWall.roomId;
      const room = rooms.find(r => r.id === roomId);
      if (room && onUpdateRoom) {
        const snapped = snapToRooms(roomId, room.x, room.y, rooms);
        if (snapped.x !== room.x || snapped.y !== room.y) {
          flushSync(() => { onUpdateRoom(roomId, { x: snapped.x, y: snapped.y }); });
        }
      }
      endBatch?.();
      setDraggingWall(null);
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => { justFinishedDragRef.current = false; });
      handled = true;
    }
    return handled;
  }, [draggingVertex, draggingWall, rooms, onUpdateRoom, endBatch, justFinishedDragRef]);

  return {
    draggingVertex,
    setDraggingVertex,
    draggingWall,
    setDraggingWall,
    handleVertexMouseMove,
    handleWallMouseMove,
    handleVertexHandleMouseDown,
    handleWallHandleMouseDown,
    onVertexMouseUp,
  };
}
