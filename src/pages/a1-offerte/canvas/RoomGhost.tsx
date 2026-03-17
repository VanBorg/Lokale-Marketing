import React from 'react';
import { Group } from 'react-konva';
import { RoomElement } from '../types';
import { PX_PER_M, WallId } from './canvasTypes';
import { clamp } from './canvasUtils';
import { renderElementContent } from './renderElementContent';

interface RoomGhostProps {
  isSelected: boolean;
  placingElement: { type: RoomElement['type']; width: number; height: number } | null;
  ghostPos: { wall: WallId; position: number } | null;
  w: number;
  h: number;
}

export default function RoomGhost({
  isSelected,
  placingElement,
  ghostPos,
  w,
  h,
}: RoomGhostProps) {
  if (!isSelected || !placingElement || !ghostPos) return null;
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
}
