import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Room, ROOM_TYPE_ICONS, ensureVertices } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { PX_PER_M } from './canvasTypes';

interface RoomLabelsProps {
  room: Room;
  rooms: Room[];
  w: number;
  h: number;
  cx: number;
  cy: number;
  rot: number;
  area: number;
  isSelected: boolean;
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
  isSelected,
  isLooseSpecial,
  subRoomCount,
  showWallNumbers,
  canvasColors,
}: RoomLabelsProps) {
  return (
    <>
      {room.isSubRoom && (
        <Text
          text="⊂"
          x={4}
          y={h - 16}
          rotation={-rot}
          fontSize={10}
          fill={canvasColors.subRoomStroke}
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
          fill={canvasColors.subRoomStroke}
          fontFamily="DM Sans, sans-serif"
        />
      )}
      {(() => {
        if (isLooseSpecial && !isSelected) {
          const icon = ROOM_TYPE_ICONS[room.roomType!] || '';
          const iconSize = 22;
          const boxSize = iconSize + 12;
          return (
            <Group x={cx} y={cy} offsetX={boxSize / 2} offsetY={boxSize / 2} rotation={-rot} opacity={0.8}>
              <Text
                text={icon}
                x={0}
                y={0}
                width={boxSize}
                height={boxSize}
                fontSize={iconSize}
                fontFamily="sans-serif"
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          );
        }
        let labelText: string;
        if (isLooseSpecial) {
          labelText = `${room.name}\n${area.toFixed(1)} m²`;
        } else if (room.isSubRoom) {
          labelText = room.name;
        } else if (isSelected) {
          labelText = `${room.name}\n${area.toFixed(1)} m²`;
        } else {
          labelText = room.name;
        }
        const fontSize = isSelected ? 12 : 10;
        const charW = isSelected ? 7 : 5.5;
        const lines = labelText.split('\n');
        const lineCount = lines.length;
        const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
        const padH = 10;
        const padV = 6;
        const lineH = fontSize + 3;
        const boxW = Math.min(Math.max(maxLineLen * charW + padH * 2, 56), w - 16);
        const boxH = lineCount * lineH + padV * 2;
        const opacity = isSelected ? 1 : 0.7;
        return (
          <Group x={cx} y={cy} offsetX={boxW / 2} offsetY={boxH / 2} rotation={-rot} opacity={opacity}>
            <Rect
              x={0}
              y={0}
              width={boxW}
              height={boxH}
              fill={canvasColors.dimensionLabelBg}
              stroke={canvasColors.dimensionLabelText}
              strokeWidth={isSelected ? 0.5 : 0.3}
              cornerRadius={4}
              opacity={1}
            />
            <Text
              text={labelText}
              x={0}
              y={(boxH - lineCount * lineH) / 2}
              width={boxW}
              fontSize={fontSize}
              fontFamily="DM Sans, sans-serif"
              fill={
                room.isSubRoom
                  ? canvasColors.subRoomStroke
                  : canvasColors.dimensionLabelText
              }
              align="center"
              lineHeight={1.25}
              listening={false}
            />
          </Group>
        );
      })()}
      {showWallNumbers && (() => {
        const hasVerts = (room.vertices?.length ?? 0) >= 3;
        if (hasVerts) {
          const verts = ensureVertices(room);
          return (
            <>
              {verts.map((v, i) => {
                const next = verts[(i + 1) % verts.length];
                const mx = ((v.x + next.x) / 2) * PX_PER_M;
                const my = ((v.y + next.y) / 2) * PX_PER_M;
                const dx = (next.x - v.x) * PX_PER_M;
                const dy = (next.y - v.y) * PX_PER_M;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 1) return null;
                const inX = -(dy / len) * 12;
                const inY = (dx / len) * 12;
                  return (
                  <Text
                    key={`wn-${i}`}
                    text={String(i + 1)}
                    x={mx + inX - 4}
                    y={my + inY - 5}
                    fontSize={10}
                    fill={canvasColors.wallNumber}
                    fontFamily="DM Sans, sans-serif"
                    rotation={-rot}
                  />
                );
              })}
            </>
          );
        }
        return (
          <>
            <Text text="1" x={w / 2 - 4} y={2} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" rotation={-rot} />
            <Text text="2" x={w - 12} y={h / 2 - 5} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" rotation={-rot} />
            <Text text="3" x={w / 2 - 4} y={h - 14} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" rotation={-rot} />
            <Text text="4" x={2} y={h / 2 - 5} fontSize={10} fill={canvasColors.wallNumber} fontFamily="DM Sans, sans-serif" rotation={-rot} />
          </>
        );
      })()}
    </>
  );
}
