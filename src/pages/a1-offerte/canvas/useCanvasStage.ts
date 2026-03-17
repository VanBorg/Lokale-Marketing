import { useRef, useState, useEffect, useCallback } from 'react';
import Konva from 'konva';
import { SCALE_BY, MIN_SCALE, MAX_SCALE } from './canvasTypes';

export function useCanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  // Always-current size ref so goToCenter is never stale when called from
  // effects that captured an earlier closure (e.g. on first mount).
  const sizeRef = useRef({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const measure = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newSize = { width: rect.width, height: rect.height - 44 };
      sizeRef.current = newSize; // sync update so goToCenter sees it immediately
      setSize(newSize);
    }
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY));
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    setScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  }, []);

  const adjustZoom = useCallback((factor: number) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    const cx = size.width / 2;
    const cy = size.height / 2;
    setStagePos({ x: cx - (cx - stagePos.x) * (newScale / scale), y: cy - (cy - stagePos.y) * (newScale / scale) });
    setScale(newScale);
  }, [scale, stagePos, size]);

  const resetZoom = useCallback(() => { setScale(1); setStagePos({ x: 0, y: 0 }); }, []);

  const goToCenter = useCallback(() => {
    // Use sizeRef so this is always correct even when called from a stale closure
    setStagePos({ x: sizeRef.current.width / 2, y: sizeRef.current.height / 2 });
  }, []); // no size dependency needed — ref is always current

  const handleStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target !== e.target.getStage()) return;
    setStagePos({ x: e.target.x(), y: e.target.y() });
  }, []);

  return { containerRef, size, scale, stagePos, setStagePos, handleWheel, adjustZoom, resetZoom, goToCenter, handleStageDragEnd };
}
