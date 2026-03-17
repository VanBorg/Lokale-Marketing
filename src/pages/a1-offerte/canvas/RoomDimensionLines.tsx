import React from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import { Room, ensureVertices, vertexWallLengths } from '../types';
import { CanvasColors } from '../../../hooks/useTheme';
import { PX_PER_M } from './canvasTypes';

interface RoomDimensionLinesProps {
  shapeType: NonNullable<Room['shapeType']>;
  w: number;
  h: number;
  cx: number;
  cy: number;
  rot: number;
  room: Room;
  isSelected: boolean;
  isDraggingHandle?: boolean;
  canvasColors: CanvasColors;
}

function VertexDimensionLines({
  room,
  rot,
  canvasColors,
}: {
  room: Room;
  rot: number;
  canvasColors: CanvasColors;
}) {
  const verts = ensureVertices(room);
  const wallLens = vertexWallLengths(verts);
  const offset = 20;
  const tickHalf = 8;

  return (
    <>
      {verts.map((v, i) => {
        const next = verts[(i + 1) % verts.length];
        const v1x = v.x * PX_PER_M;
        const v1y = v.y * PX_PER_M;
        const v2x = next.x * PX_PER_M;
        const v2y = next.y * PX_PER_M;
        const dx = v2x - v1x;
        const dy = v2y - v1y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return null;

        const nx = dy / len;
        const ny = -dx / len;
        const tx = dx / len;
        const ty = dy / len;
        const ox = nx * offset;
        const oy = ny * offset;
        const mx = (v1x + v2x) / 2;
        const my = (v1y + v2y) / 2;
        const label = wallLens[i].toFixed(1);

        return (
          <React.Fragment key={`dim-${i}`}>
            <Line
              points={[v1x + ox, v1y + oy, v2x + ox, v2y + oy]}
              stroke={canvasColors.dimensionLine}
              strokeWidth={0.5}
            />
            <Line
              points={[
                v1x + ox - tx * 0, v1y + oy - ty * 0,
                v1x + nx * (offset - tickHalf), v1y + ny * (offset - tickHalf),
                v1x + nx * (offset + tickHalf), v1y + ny * (offset + tickHalf),
              ]}
              stroke={canvasColors.dimensionLine}
              strokeWidth={0.5}
            />
            <Line
              points={[
                v2x + nx * (offset - tickHalf), v2y + ny * (offset - tickHalf),
                v2x + nx * (offset + tickHalf), v2y + ny * (offset + tickHalf),
              ]}
              stroke={canvasColors.dimensionLine}
              strokeWidth={0.5}
            />
            <Rect
              x={mx + ox - 14}
              y={my + oy - 7}
              width={28}
              height={14}
              fill={canvasColors.dimensionLabelBg}
              cornerRadius={2}
            />
            <Text
              text={label}
              x={mx + ox - 12}
              y={my + oy - 5}
              fontSize={10}
              fill={canvasColors.dimensionLabelText}
              fontFamily="DM Sans, sans-serif"
              rotation={-rot}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function RoomDimensionLines({
  shapeType,
  w,
  h,
  cx,
  cy,
  rot,
  room,
  isSelected,
  isDraggingHandle,
  canvasColors,
}: RoomDimensionLinesProps) {
  const hasVertices = (room.vertices?.length ?? 0) >= 3 && shapeType !== 'circle' && shapeType !== 'halfcircle';
  const isSpecial = room.roomType !== 'normal';

  if (isSpecial && !isDraggingHandle) return null;

  return (
    <Group opacity={isSelected || room.isFinalized ? 1 : 0.4} listening={false}>
      {shapeType === 'circle' ? (
        <>
          <Line points={[0, cy, w, cy]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} dash={[3, 2]} />
          <Line points={[0, cy - 4, 0, cy + 4]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
          <Line points={[w, cy - 4, w, cy + 4]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
          <Rect x={cx - 14} y={cy - 7} width={28} height={14} fill={canvasColors.dimensionLabelBg} cornerRadius={2} />
          <Text text={room.length.toFixed(1)} x={cx - 12} y={cy - 5} fontSize={10} fill={canvasColors.dimensionLabelText} fontFamily="DM Sans, sans-serif" />
        </>
      ) : shapeType === 'halfcircle' ? (
        <>
          <Line points={[0, -20, w, -20]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
          <Line points={[0, -28, 0, -12]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
          <Line points={[w, -28, w, -12]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
          <Rect x={cx - 14} y={-27} width={28} height={14} fill={canvasColors.dimensionLabelBg} cornerRadius={2} />
          <Text text={room.length.toFixed(1)} x={cx - 12} y={-25} fontSize={10} fill={canvasColors.dimensionLabelText} fontFamily="DM Sans, sans-serif" />
        </>
      ) : hasVertices ? (
        <VertexDimensionLines room={room} rot={rot} canvasColors={canvasColors} />
      ) : (() => {
        const wl = room.wallLengths ?? { top: room.length, right: room.width, bottom: room.length, left: room.width };
        const topLabel = wl.top.toFixed(1);
        const rightLabel = wl.right.toFixed(1);
        const bottomLabel = wl.bottom.toFixed(1);
        const leftLabel = wl.left.toFixed(1);
        return (
          <>
            <Line points={[0, -20, w, -20]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
            <Line points={[0, -28, 0, -12]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
            <Line points={[w, -28, w, -12]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
            <Rect x={cx - 14} y={-27} width={28} height={14} fill={canvasColors.dimensionLabelBg} cornerRadius={2} />
            <Text text={topLabel} x={cx - 12} y={-25} fontSize={10} fill={canvasColors.dimensionLabelText} fontFamily="DM Sans, sans-serif" />

            <Line points={[w + 20, 0, w + 20, h]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
            <Line points={[w + 12, 0, w + 28, 0]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
            <Line points={[w + 12, h, w + 28, h]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
            <Rect x={w + 12} y={cy - 7} width={28} height={14} fill={canvasColors.dimensionLabelBg} cornerRadius={2} />
            <Text text={rightLabel} x={w + 14} y={cy - 5} fontSize={10} fill={canvasColors.dimensionLabelText} fontFamily="DM Sans, sans-serif" rotation={-rot} />

            {wl.bottom !== wl.top && (
              <>
                <Line points={[0, h + 20, w, h + 20]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
                <Line points={[0, h + 12, 0, h + 28]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
                <Line points={[w, h + 12, w, h + 28]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
                <Rect x={cx - 14} y={h + 13} width={28} height={14} fill={canvasColors.dimensionLabelBg} cornerRadius={2} />
                <Text text={bottomLabel} x={cx - 12} y={h + 15} fontSize={10} fill={canvasColors.dimensionLabelText} fontFamily="DM Sans, sans-serif" />
              </>
            )}

            {wl.left !== wl.right && (
              <>
                <Line points={[-20, 0, -20, h]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
                <Line points={[-28, 0, -12, 0]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
                <Line points={[-28, h, -12, h]} stroke={canvasColors.dimensionLine} strokeWidth={0.5} />
                <Rect x={-40} y={cy - 7} width={28} height={14} fill={canvasColors.dimensionLabelBg} cornerRadius={2} />
                <Text text={leftLabel} x={-38} y={cy - 5} fontSize={10} fill={canvasColors.dimensionLabelText} fontFamily="DM Sans, sans-serif" rotation={-rot} />
              </>
            )}
          </>
        );
      })()}
    </Group>
  );
}
