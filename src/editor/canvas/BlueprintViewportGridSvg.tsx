import type { Viewport } from '../../store/blueprintStore'
import {
  PIXEL_MAJOR_GRID_CM,
  PIXEL_MINOR_GRID_CM,
} from './pixelCanvasConstants'
import type { GridPatternStrokeColors } from './pixelCanvasTheme'

interface BlueprintViewportGridSvgProps {
  viewport: Viewport
  gridStroke: GridPatternStrokeColors
}

export default function BlueprintViewportGridSvg({
  viewport,
  gridStroke,
}: BlueprintViewportGridSvgProps) {
  const minorPx = PIXEL_MINOR_GRID_CM * viewport.scale
  const majorPx = PIXEL_MAJOR_GRID_CM * viewport.scale
  const patMinorX = ((viewport.x % minorPx) + minorPx) % minorPx
  const patMinorY = ((viewport.y % minorPx) + minorPx) % minorPx
  const patMajorX = ((viewport.x % majorPx) + majorPx) % majorPx
  const patMajorY = ((viewport.y % majorPx) + majorPx) % majorPx

  const { minorColor, majorColor, minorStrokeW, majorStrokeW } = gridStroke

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="bp-grid-minor"
          x={patMinorX}
          y={patMinorY}
          width={minorPx}
          height={minorPx}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${minorPx} 0 L 0 0 0 ${minorPx}`}
            fill="none"
            stroke={minorColor}
            strokeWidth={minorStrokeW}
          />
        </pattern>
        <pattern
          id="bp-grid-major"
          x={patMajorX}
          y={patMajorY}
          width={majorPx}
          height={majorPx}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${majorPx} 0 L 0 0 0 ${majorPx}`}
            fill="none"
            stroke={majorColor}
            strokeWidth={majorStrokeW}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bp-grid-minor)" />
      <rect width="100%" height="100%" fill="url(#bp-grid-major)" />
    </svg>
  )
}
