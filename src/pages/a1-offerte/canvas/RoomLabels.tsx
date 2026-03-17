import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Room, ROOM_TYPE_ICONS } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';

interface RoomLabelsProps {
  room: Room;
  rooms: Room[];
  w: number;
  h: number;
  cx: number;
  cy: number;
  rot: number;
  area: number;
  isLooseSpecial: boolean;
  subRoomCount: number;
  showWallNumbers: boolean;
  canvasColors: CanvasColors;
}

export default function RoomLabels({
  room,
  w,
  h,
  cx,
  cy,
  rot,
  area,
  isLooseSpecial,
  subRoomCount,
  showWallNumbers,
  canvasColors,
}: RoomLabelsProps) {
  return (
    <>
      {room.roomType && room.roomType !== 'normal' && (
        <Text
          text={ROOM_TYPE_ICONS[room.roomType] || ''}
          x={w - 20}
          y={4}
          rotation={-rot}
          fontSize={14}
          fontFamily="sans-serif"
        />
      )}
      {room.isSubRoom && (
        <Text
          text="⊂"
          x={4}
          y={h - 16}
          rotation={-rot}
          fontSize={10}
          fill="#1A6BFF"
          fontFamily="sans-serif"
        />
      )}
      {room.roomType === 'normal' && subRoomCount > 0 && (
        <Text
          text={`●${subRoomCount}`}
          x={w - 24}
          y={h - 14}
          rotation={-rot}
          fontSize={9}
          fill="#1A6BFF"
          fontFamily="DM Sans, sans-serif"
        />
      )}
      {(() => {
        const labelText =
          room.isSubRoom
            ? room.name
            : isLooseSpecial
              ? `${room.name}\n(los)`
              : `${room.name}\n${area.toFixed(1)} m²`;
        const lines = labelText.split('\n');
        const lineCount = lines.length;
        const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
        const padH = 10;
        const padV = 6;
        const boxW = Math.min(Math.max(maxLineLen * 7 + padH * 2, 56), w - 16);
        const boxH = lineCount * 15 + padV * 2;
        return (
          <Group x={cx} y={cy} offsetX={boxW / 2} offsetY={boxH / 2} rotation={-rot}>
            <Rect
              x={0}
              y={0}
              width={boxW}
              height={boxH}
              fill={canvasColors.dimensionLabelBg}
              stroke={canvasColors.dimensionLabelText}
              strokeWidth={0.5}
              cornerRadius={4}
              opacity={1}
            />
            <Text
              text={labelText}
              x={0}
              y={(boxH - lineCount * 15) / 2}
              width={boxW}
              fontSize={12}
              fontFamily="DM Sans, sans-serif"
              fill={
                room.isSubRoom
                  ? '#1A6BFF'
                  : canvasColors.dimensionLabelText
              }
              align="center"
              lineHeight={1.25}
              listening={false}
            />
          </Group>
        );
      })()}
      {showWallNumbers && (
        <>
          <Text text="1" x={w / 2 - 4} y={2} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
          <Text text="2" x={w - 12} y={h / 2 - 5} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
          <Text text="3" x={w / 2 - 4} y={h - 14} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
          <Text text="4" x={2} y={h / 2 - 5} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" />
        </>
      )}
    </>
  );
}
