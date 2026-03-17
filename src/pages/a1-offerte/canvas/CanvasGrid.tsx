import React from 'react';
import { Layer, Line } from 'react-konva';

const CENTER_CROSS_SIZE = 40;

interface CanvasGridProps {
  thinLines: { points: number[] }[];
  thickLines: { points: number[] }[];
  canvasColors: { gridThin: string; gridThick: string };
  theme: string;
}

export default function CanvasGrid({ thinLines, thickLines, canvasColors, theme }: CanvasGridProps) {
  return (
    <Layer listening={false}>
      {thinLines.map((line, i) => (
        <Line key={`t-${i}`} points={line.points} stroke={canvasColors.gridThin} strokeWidth={1} listening={false} />
      ))}
      {thickLines.map((line, i) => (
        <Line key={`k-${i}`} points={line.points} stroke={canvasColors.gridThick} strokeWidth={1} listening={false} />
      ))}
      {theme === 'dark' && (
        <>
          <Line points={[-CENTER_CROSS_SIZE, 0, CENTER_CROSS_SIZE, 0]} stroke="#FFFFFF" strokeWidth={1.5} listening={false} />
          <Line points={[0, -CENTER_CROSS_SIZE, 0, CENTER_CROSS_SIZE]} stroke="#FFFFFF" strokeWidth={1.5} listening={false} />
        </>
      )}
    </Layer>
  );
}
