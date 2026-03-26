import { Layer, Circle, Line, Group } from 'react-konva'
import {
  ORIGIN_CROSS_HALF,
  ORIGIN_GLOW_MID,
  ORIGIN_GLOW_OUTER,
} from './pixelCanvasConstants'
import type { OriginCrossPalette } from './pixelCanvasTheme'

interface OriginCrossKonvaProps {
  palette: OriginCrossPalette
}

export default function OriginCrossKonva({ palette }: OriginCrossKonvaProps) {
  const o = palette
  return (
    <Layer listening={false}>
      <Group>
        <Line
          points={[-ORIGIN_GLOW_OUTER, 0, ORIGIN_GLOW_OUTER, 0]}
          stroke={o.underlay}
          strokeWidth={o.swUnder}
          lineCap="round"
        />
        <Line
          points={[0, -ORIGIN_GLOW_OUTER, 0, ORIGIN_GLOW_OUTER]}
          stroke={o.underlay}
          strokeWidth={o.swUnder}
          lineCap="round"
        />
        <Line
          points={[-ORIGIN_GLOW_MID, 0, ORIGIN_GLOW_MID, 0]}
          stroke={o.mid}
          strokeWidth={o.swMid}
          lineCap="round"
        />
        <Line
          points={[0, -ORIGIN_GLOW_MID, 0, ORIGIN_GLOW_MID]}
          stroke={o.mid}
          strokeWidth={o.swMid}
          lineCap="round"
        />
        <Line
          points={[-ORIGIN_CROSS_HALF, 0, ORIGIN_CROSS_HALF, 0]}
          stroke={o.main}
          strokeWidth={o.swMain}
          lineCap="round"
          shadowBlur={o.shadowBlur}
          shadowColor={o.shadow}
          shadowOffsetX={0}
          shadowOffsetY={0}
        />
        <Line
          points={[0, -ORIGIN_CROSS_HALF, 0, ORIGIN_CROSS_HALF]}
          stroke={o.main}
          strokeWidth={o.swMain}
          lineCap="round"
          shadowBlur={o.shadowBlur}
          shadowColor={o.shadow}
          shadowOffsetX={0}
          shadowOffsetY={0}
        />
        <Circle
          x={0}
          y={0}
          radius={18}
          fill={o.centreFill}
          stroke={o.centreStroke}
          strokeWidth={o.swCentre}
          listening={false}
        />
        <Circle
          x={0}
          y={0}
          radius={52}
          stroke={o.ring}
          strokeWidth={o.swRing}
          opacity={o.ringOpacity}
          fillEnabled={false}
          listening={false}
        />
      </Group>
    </Layer>
  )
}
