import React from 'react';
import { Rect, Arc, Line } from 'react-konva';
import { RoomElement } from '../types';
import { WallId } from './canvasTypes';

export function renderElementContent(
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
