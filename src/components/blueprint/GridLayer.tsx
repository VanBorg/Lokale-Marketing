import { memo } from 'react'
import { Layer, Shape } from 'react-konva'
import type Konva from 'konva'
import type { Viewport } from '../../store/blueprintStore'
import {
  PIXEL_MAJOR_GRID_CM,
  PIXEL_MINOR_GRID_CM,
} from '../../editor/canvas/pixelCanvasConstants'

interface GridLayerProps {
  width: number
  height: number
  viewport: Viewport
  isDark?: boolean
}

const GridLayer = memo(function GridLayer({ width, height, viewport, isDark = true }: GridLayerProps) {
  const { scale, x: ox, y: oy } = viewport

  const left   = -ox / scale
  const top    = -oy / scale
  const right  = left + width  / scale
  const bottom = top  + height / scale

  const minorColor = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'
  const majorColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)'
  const minorWidth = 0.6 / scale
  const majorWidth = 1.2 / scale

  return (
    <Layer listening={false}>
      <Shape
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx: Konva.Context) => {
          const c = ctx._context as CanvasRenderingContext2D

          // ── Minor grid (2 m) — skip positions that fall on a major line ──
          c.beginPath()
          c.strokeStyle = minorColor
          c.lineWidth = minorWidth

          const minorX0 = Math.floor(left  / PIXEL_MINOR_GRID_CM) * PIXEL_MINOR_GRID_CM
          const minorY0 = Math.floor(top   / PIXEL_MINOR_GRID_CM) * PIXEL_MINOR_GRID_CM

          for (let x = minorX0; x <= right;  x += PIXEL_MINOR_GRID_CM) {
            if (x % PIXEL_MAJOR_GRID_CM === 0) continue
            c.moveTo(x, top); c.lineTo(x, bottom)
          }
          for (let y = minorY0; y <= bottom; y += PIXEL_MINOR_GRID_CM) {
            if (y % PIXEL_MAJOR_GRID_CM === 0) continue
            c.moveTo(left, y); c.lineTo(right, y)
          }
          c.stroke()

          // ── Major grid (10 m) ────────────────────────────────────────────
          c.beginPath()
          c.strokeStyle = majorColor
          c.lineWidth = majorWidth

          const majorX0 = Math.floor(left  / PIXEL_MAJOR_GRID_CM) * PIXEL_MAJOR_GRID_CM
          const majorY0 = Math.floor(top   / PIXEL_MAJOR_GRID_CM) * PIXEL_MAJOR_GRID_CM

          for (let x = majorX0; x <= right;  x += PIXEL_MAJOR_GRID_CM) {
            c.moveTo(x, top); c.lineTo(x, bottom)
          }
          for (let y = majorY0; y <= bottom; y += PIXEL_MAJOR_GRID_CM) {
            c.moveTo(left, y); c.lineTo(right, y)
          }
          c.stroke()
        }}
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
      />
    </Layer>
  )
})

export default GridLayer
