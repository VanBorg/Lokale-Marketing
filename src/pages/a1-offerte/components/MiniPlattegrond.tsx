import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Stage as KonvaStage, Layer, Line, Text, Group } from 'react-konva';
import { Room } from '../types';
import { ROOM_TYPE_ICONS, getRoomFillKey } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { boundingSize } from '../canvas/canvasGeometry';
import { miniPoints } from '../canvas/canvasGeometry';

const Stage = KonvaStage as unknown as React.ComponentType<any>;

interface MiniPlattegrondProps {
  rooms: Room[];
  selectedRoomId: string | null;
  canvasColors: CanvasColors;
}

export default function MiniPlattegrond({ rooms, selectedRoomId, canvasColors }: MiniPlattegrondProps) {
  const [miniOpen, setMiniOpen] = useState(true);
  const miniContainerRef = useRef<HTMLDivElement>(null);
  const [miniWidth, setMiniWidth] = useState(400);

  useEffect(() => {
    if (!miniContainerRef.current) return;
    const measure = () => {
      const rect = miniContainerRef.current!.getBoundingClientRect();
      setMiniWidth(rect.width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(miniContainerRef.current);
    return () => observer.disconnect();
  }, [miniOpen]);

  const miniData = useMemo(() => {
    if (rooms.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rooms) {
      const { w, h } = boundingSize(r);
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + w);
      maxY = Math.max(maxY, r.y + h);
    }
    const totalW = maxX - minX || 1;
    const totalH = maxY - minY || 1;
    const miniH = 180;
    const pad = 20;
    const sX = (miniWidth - pad * 2) / totalW;
    const sY = (miniH - pad * 2) / totalH;
    const s = Math.min(sX, sY, 3);
    const oX = (miniWidth - totalW * s) / 2 - minX * s;
    const oY = (miniH - totalH * s) / 2 - minY * s;
    return { s, oX, oY, miniH };
  }, [rooms, miniWidth]);

  return (
    <div className="border-b border-dark-border">
      <button
        type="button"
        onClick={() => setMiniOpen(p => !p)}
        className="w-full px-4 py-2 text-[11px] font-medium text-light/50 hover:text-light/80 transition-colors cursor-pointer text-left"
      >
        {miniOpen ? '▲ Plattegrond verbergen' : '▼ Plattegrond tonen'}
      </button>
      {miniOpen && miniData && (
        <div ref={miniContainerRef} style={{ height: miniData.miniH, background: canvasColors.stageBg }}>
          <Stage width={miniWidth} height={miniData.miniH} listening={false}>
            <Layer>
              <Group x={miniData.oX} y={miniData.oY} scaleX={miniData.s} scaleY={miniData.s}>
                {rooms.map(r => {
                  const { w: rw, h: rh } = boundingSize(r);
                  const isSel = r.id === selectedRoomId;
                  const pts = miniPoints(r, rw, rh);
                  const fill = canvasColors[getRoomFillKey(r)];
                  const strokeColor = isSel ? canvasColors.roomStrokeSelected : (r.isSubRoom ? canvasColors.subRoomStroke : canvasColors.roomStroke);
                  return (
                    <Group key={r.id} x={r.x} y={r.y}>
                      <Line points={pts} closed fill={fill} stroke={strokeColor} strokeWidth={isSel ? 2 / miniData.s : 1 / miniData.s} />
                      <Text
                        text={r.name}
                        x={4}
                        y={4}
                        fontSize={10 / miniData.s}
                        fill={isSel ? canvasColors.textSelected : canvasColors.text}
                        opacity={isSel ? 1 : 0.5}
                        fontFamily="DM Sans, sans-serif"
                      />
                      {r.roomType !== 'normal' && (
                        <Text text={ROOM_TYPE_ICONS[r.roomType] || ''} x={rw - 16 / miniData.s} y={4} fontSize={12 / miniData.s} />
                      )}
                    </Group>
                  );
                })}
              </Group>
            </Layer>
          </Stage>
        </div>
      )}
      {miniOpen && !miniData && (
        <div ref={miniContainerRef} className="px-4 py-6 text-center text-xs text-light/30">
          Geen kamers om te tonen
        </div>
      )}
    </div>
  );
}
