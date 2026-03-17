import React from 'react';
import { Line, Arc, Circle, Shape } from 'react-konva';
import { Room } from '../types';
import { PX_PER_M } from './canvasTypes';

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
  finalizedStripeGreen?: string;
  finalizedStripeLineWidth?: number;
}

export default function RoomShape({
  shapeType,
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
  finalizedStripeGreen,
  finalizedStripeLineWidth,
}: RoomShapeProps) {
  return (
    <>
      {shapeType === 'rect' && (() => {
        const topSloped = room.walls.top.heightLeft !== room.walls.top.heightRight;
        const useGradient = topSloped && !room.isSubRoom && !isLooseSpecial;
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
      {shapeType === 'rect' && (() => {
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
      {shapeType === 'circle' && (
        <Circle
          x={cx}
          y={cy}
          radius={(room.length * PX_PER_M) / 2}
          fill={roomFill}
          stroke={stroke}
          strokeWidth={isSelected ? 2 : 1}
          opacity={strokeOpacity}
          dash={dashPattern}
        />
      )}
      {shapeType === 'halfcircle' && (
        <Arc
          x={cx}
          y={cy}
          innerRadius={0}
          outerRadius={(room.length * PX_PER_M) / 2}
          angle={180}
          rotation={-90}
          fill={roomFill}
          stroke={stroke}
          strokeWidth={isSelected ? 2 : 1}
          opacity={strokeOpacity}
          dash={dashPattern}
        />
      )}
      {shapeType === 'plus' && (
        <Shape
          sceneFunc={(context: any, shape: any) => {
            const tx = w / 3;
            const ty = h / 3;
            context.beginPath();
            context.moveTo(tx, 0);
            context.lineTo(w - tx, 0);
            context.lineTo(w - tx, ty);
            context.lineTo(w, ty);
            context.lineTo(w, h - ty);
            context.lineTo(w - tx, h - ty);
            context.lineTo(w - tx, h);
            context.lineTo(tx, h);
            context.lineTo(tx, h - ty);
            context.lineTo(0, h - ty);
            context.lineTo(0, ty);
            context.lineTo(tx, ty);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          fill={roomFill}
          stroke={stroke}
          strokeWidth={isSelected ? 2 : 1}
          opacity={strokeOpacity}
          dash={dashPattern}
        />
      )}
      {shapeType === 'ruit' && (
        <Shape
          sceneFunc={(context: any, shape: any) => {
            context.beginPath();
            context.moveTo(w / 2, 0);
            context.lineTo(w, h / 2);
            context.lineTo(w / 2, h);
            context.lineTo(0, h / 2);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          fill={roomFill}
          stroke={stroke}
          strokeWidth={isSelected ? 2 : 1}
          opacity={strokeOpacity}
          dash={dashPattern}
        />
      )}
      {room.isFinalized && finalizedStripeGreen != null && finalizedStripeLineWidth != null && (
        <Shape
          sceneFunc={(ctx: any) => {
            ctx.save();
            ctx.beginPath();
            if (shapeType === 'circle') {
              ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
            } else if (shapeType === 'halfcircle') {
              ctx.arc(cx, cy, w / 2, -Math.PI / 2, Math.PI / 2);
            } else {
              ctx.moveTo(points[0], points[1]);
              for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
              ctx.closePath();
            }
            ctx.clip();
            ctx.strokeStyle = finalizedStripeGreen;
            ctx.lineWidth = finalizedStripeLineWidth;
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
