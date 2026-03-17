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
      {(() => {
        if (room.roomType !== 'normal') {
          const icon = ROOM_TYPE_ICONS[room.roomType!] || '';
          const iconSize = 22;
          const pad = 12;
          const showM2 = isSelected;
          const boxW = iconSize + pad * 2;
          const lineH = 14;
          const boxH = showM2 ? iconSize + pad + lineH : iconSize + pad * 2;
          return (
            <Group x={cx} y={cy} offsetX={boxW / 2} offsetY={boxH / 2} rotation={-rot} opacity={isSelected ? 1 : 0.8}>
              <Rect
                x={0}
                y={0}
                width={boxW}
                height={boxH}
                fill={canvasColors.dimensionLabelBg}
                stroke={canvasColors.dimensionLabelText}
                strokeWidth={isSelected ? 0.5 : 0.3}
                cornerRadius={4}
                listening={false}
              />
              <Text
                text={icon}
                x={0}
                y={0}
                width={boxW}
                height={showM2 ? iconSize + pad : boxH}
                fontSize={iconSize}
                fontFamily="sans-serif"
                align="center"
                verticalAlign="middle"
                listening={false}
              />
              {showM2 && (
                <Text
                  text={`${area.toFixed(1)} m²`}
                  x={0}
                  y={iconSize + pad}
                  width={boxW}
                  height={lineH}
                  fontSize={10}
                  fontFamily="DM Sans, sans-serif"
                  fill={canvasColors.dimensionLabelText}
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              )}
            </Group>
          );
        }
        let labelText: string;
        if (room.isSubRoom) {
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
