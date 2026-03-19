import React from 'react';
import { Line, Shape } from 'react-konva';
import { Room } from '../types';

interface RoomShapeProps {
  shapeType: NonNullable<Room['shapeType']>;
  points: number[];
  w: number;
  h: number;
  cx: number;
  cy: number;
  roomFill: string;
  stroke: string;
  strokeOpacity: number;
  dashPattern: number[] | undefined;
  isSelected: boolean;
  room: Room;
  isLooseSpecial: boolean;
  isSpecialRoom: boolean;
  /** Diagonal stripe colour for finalized rooms (all rooms use same style) */
  finalizedRoomStripe?: string;
  finalizedRoomStripeLineWidth?: number;
}

export default function RoomShape({
  points,
  w,
  h,
  cx,
  cy,
  roomFill,
  stroke,
  strokeOpacity,
  dashPattern,
  isSelected,
  room,
  isLooseSpecial,
  finalizedRoomStripe,
  finalizedRoomStripeLineWidth,
}: RoomShapeProps) {
  return (
    <>
      {(() => {
        const topSloped = room.walls.top.heightLeft !== room.walls.top.heightRight;
        const useGradient = topSloped && !room.isSubRoom && !isLooseSpecial && !room.isFinalized;
        const higherLeft = room.walls.top.heightLeft > room.walls.top.heightRight;

        return (
          <Line
            points={points}
            closed
            stroke={stroke}
            strokeWidth={isSelected ? 2 : 1}
            opacity={strokeOpacity}
            dash={dashPattern}
            {...(useGradient
              ? {
                  fillLinearGradientStartPoint: { x: 0, y: 0 },
                  fillLinearGradientEndPoint: { x: w, y: 0 },
                  fillLinearGradientColorStops: higherLeft
                    ? [0, 'rgba(255,255,255,0.08)', 1, roomFill]
                    : [0, roomFill, 1, 'rgba(255,255,255,0.08)'],
                }
              : { fill: roomFill })}
          />
        );
      })()}
      {(() => {
        const slopedWalls: { wall: string; x1: number; y1: number; x2: number; y2: number }[] = [];
        if (room.walls.top.heightLeft !== room.walls.top.heightRight)
          slopedWalls.push({ wall: 'top', x1: 0, y1: 0, x2: w, y2: 0 });
        if (room.walls.bottom.heightLeft !== room.walls.bottom.heightRight)
          slopedWalls.push({ wall: 'bottom', x1: 0, y1: h, x2: w, y2: h });
        if (room.walls.left.heightLeft !== room.walls.left.heightRight)
          slopedWalls.push({ wall: 'left', x1: 0, y1: 0, x2: 0, y2: h });
        if (room.walls.right.heightLeft !== room.walls.right.heightRight)
          slopedWalls.push({ wall: 'right', x1: w, y1: 0, x2: w, y2: h });
        if (slopedWalls.length === 0) return null;
        return (
          <>
            {slopedWalls.map((sw) => (
              <React.Fragment key={sw.wall}>
                <Line
                  points={[sw.x1, sw.y1, sw.x2, sw.y2]}
                  stroke="#FF5C1A"
                  strokeWidth={1.5}
                  dash={[4, 3]}
                  opacity={0.6}
                  listening={false}
                />
                <Line
                  points={[sw.x1, sw.y1, sw.x1 + 8, sw.y1, sw.x1, sw.y1 + 8]}
                  closed
                  fill="#FF5C1A"
                  opacity={0.7}
                  listening={false}
                />
              </React.Fragment>
            ))}
          </>
        );
      })()}
      {room.isFinalized && finalizedRoomStripe != null && finalizedRoomStripeLineWidth != null && (
        <Shape
          sceneFunc={(ctx: any) => {
            const xs: number[] = [];
            const ys: number[] = [];
            for (let i = 0; i < points.length; i += 2) {
              xs.push(points[i]);
              ys.push(points[i + 1]);
            }
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const span = Math.max(maxX - minX, maxY - minY);

            ctx.save();
            // Clip to room polygon first (in rotated local space — correct boundary)
            ctx.beginPath();
            ctx.moveTo(points[0], points[1]);
            for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
            ctx.closePath();
            ctx.clip();
            // Counter-rotate around room centre so stripes stay world-aligned
            const rotation = room.rotation ?? 0;
            if (rotation !== 0) {
              ctx.translate(cx, cy);
              ctx.rotate(-rotation * Math.PI / 180);
              ctx.translate(-cx, -cy);
            }
            ctx.strokeStyle = finalizedRoomStripe;
            ctx.lineWidth = finalizedRoomStripeLineWidth;
            ctx.lineCap = 'butt';
            const step = 12;
            for (let y = minY - span; y <= maxY + span; y += step) {
              ctx.beginPath();
              ctx.moveTo(minX - span, y);
              ctx.lineTo(maxX + span, y + span);
              ctx.stroke();
            }
            for (let y = minY - span; y <= maxY + span; y += step) {
              ctx.beginPath();
              ctx.moveTo(maxX + span, y);
              ctx.lineTo(minX - span, y - span);
              ctx.stroke();
            }
            ctx.restore();
          }}
          listening={false}
        />
      )}
    </>
  );
}
