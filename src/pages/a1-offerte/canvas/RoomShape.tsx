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
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(points[0], points[1]);
            for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
            ctx.closePath();
            ctx.clip();
            ctx.strokeStyle = finalizedRoomStripe;
            ctx.lineWidth = finalizedRoomStripeLineWidth;
            ctx.lineCap = 'butt';
            const step = 12;
            for (let y = -w; y <= h + w; y += step) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(w, y + w);
              ctx.stroke();
            }
            for (let y = -w; y <= h + w; y += step) {
              ctx.beginPath();
              ctx.moveTo(w, y);
              ctx.lineTo(0, y - w);
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
