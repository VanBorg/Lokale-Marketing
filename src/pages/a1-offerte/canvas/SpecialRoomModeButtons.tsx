import React, { useState } from 'react';
import { Group, Circle, Arrow, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { SpecialRoomPlacementMode } from '../specialRooms/types';

interface SpecialRoomModeButtonsProps {
  w: number;
  h: number;
  cx: number;
  cy: number;
  currentMode: SpecialRoomPlacementMode | undefined;
  onSetMode: (mode: SpecialRoomPlacementMode) => void;
}

const RADIUS = 11;
const SPACING = 30;
const ABOVE_OFFSET = 24 + RADIUS;
const COLOR_ORANGE = '#FF6B00';
const COLOR_BLUE = '#2D7FF9';
const COLOR_INACTIVE = '#444444';
const COLOR_WHITE = '#FFFFFF';

function CrosshairIcon({ active }: { active: boolean }) {
  const c = COLOR_WHITE;
  const s = active ? 1.5 : 1;
  const r = 5;
  return (
    <>
      <Arrow points={[0, 0, 0, -r]} pointerLength={3} pointerWidth={3} fill={c} stroke={c} strokeWidth={s} listening={false} />
      <Arrow points={[0, 0, 0,  r]} pointerLength={3} pointerWidth={3} fill={c} stroke={c} strokeWidth={s} listening={false} />
      <Arrow points={[0, 0, -r, 0]} pointerLength={3} pointerWidth={3} fill={c} stroke={c} strokeWidth={s} listening={false} />
      <Arrow points={[0, 0,  r, 0]} pointerLength={3} pointerWidth={3} fill={c} stroke={c} strokeWidth={s} listening={false} />
    </>
  );
}

function InsideIcon({ active }: { active: boolean }) {
  const c = COLOR_WHITE;
  const s = active ? 1.5 : 1;
  return (
    <>
      <Arrow points={[-5, -3, 0, 0]} pointerLength={3} pointerWidth={3} fill={c} stroke={c} strokeWidth={s} listening={false} />
      <Arrow points={[ 5, -3, 0, 0]} pointerLength={3} pointerWidth={3} fill={c} stroke={c} strokeWidth={s} listening={false} />
    </>
  );
}

function OutsideIcon({ active }: { active: boolean }) {
  const c = COLOR_WHITE;
  const s = active ? 1.5 : 1;
  return (
    <>
      <Arrow points={[0, 0, -5, -3]} pointerLength={3} pointerWidth={3} fill={c} stroke={c} strokeWidth={s} listening={false} />
      <Arrow points={[0, 0,  5, -3]} pointerLength={3} pointerWidth={3} fill={c} stroke={c} strokeWidth={s} listening={false} />
    </>
  );
}

interface TooltipProps {
  text: string;
  x: number;
  y: number;
}

function Tooltip({ text, x, y }: TooltipProps) {
  const fontSize = 10;
  const padX = 5;
  const padY = 3;
  const approxW = text.length * fontSize * 0.58 + padX * 2;
  const approxH = fontSize + padY * 2;
  return (
    <Group x={x - approxW / 2} y={y} listening={false}>
      <Rect width={approxW} height={approxH} fill="#1a1a1a" opacity={0.88} cornerRadius={3} />
      <Text
        text={text}
        x={padX} y={padY}
        fontSize={fontSize}
        fontFamily="sans-serif"
        fill={COLOR_WHITE}
        listening={false}
      />
    </Group>
  );
}

export default function SpecialRoomModeButtons({
  cx, currentMode, onSetMode,
}: SpecialRoomModeButtonsProps) {
  const [hovered, setHovered] = useState<'free' | 'wall' | null>(null);

  const buttonY = -ABOVE_OFFSET;
  const freeX = cx - SPACING / 2;
  const wallX = cx + SPACING / 2;

  const isFree = currentMode === 'free';
  const isInside = currentMode === 'inside';

  const handleFreeClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    onSetMode(isFree ? 'inside' : 'free');
  };

  const handleWallClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    if (currentMode === 'inside') onSetMode('outside');
    else onSetMode('inside'); // covers 'outside' and 'free'
  };

  const wallTooltipText = isInside ? 'Binnen' : 'Buiten';
  const tooltipY = buttonY + RADIUS + 5;

  return (
    <Group>
      {/* ── Button 1: Vrij plaatsen ── */}
      <Group
        x={freeX} y={buttonY}
        onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => handleFreeClick(e)}
        onTouchStart={(e: Konva.KonvaEventObject<TouchEvent>) => handleFreeClick(e)}
        onMouseEnter={() => setHovered('free')}
        onMouseLeave={() => setHovered(null)}
      >
        <Circle
          radius={RADIUS}
          fill={isFree ? COLOR_BLUE : COLOR_INACTIVE}
          stroke={isFree ? COLOR_WHITE : COLOR_BLUE}
          strokeWidth={1.5}
          listening={true}
        />
        <CrosshairIcon active={isFree} />
      </Group>

      {/* ── Button 2: Binnen / Buiten ── */}
      <Group
        x={wallX} y={buttonY}
        opacity={isFree ? 0.4 : 1}
        onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => handleWallClick(e)}
        onTouchStart={(e: Konva.KonvaEventObject<TouchEvent>) => handleWallClick(e)}
        onMouseEnter={() => setHovered('wall')}
        onMouseLeave={() => setHovered(null)}
      >
        <Circle
          radius={RADIUS}
          fill={!isFree ? COLOR_ORANGE : COLOR_INACTIVE}
          stroke={!isFree ? COLOR_WHITE : COLOR_ORANGE}
          strokeWidth={1.5}
          listening={true}
        />
        {isInside ? <InsideIcon active={!isFree} /> : <OutsideIcon active={!isFree} />}
      </Group>

      {/* ── Tooltips ── */}
      {hovered === 'free' && (
        <Tooltip text="Plaats overal" x={freeX} y={tooltipY} />
      )}
      {hovered === 'wall' && (
        <Tooltip text={wallTooltipText} x={wallX} y={tooltipY} />
      )}
    </Group>
  );
}
