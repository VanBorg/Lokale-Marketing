import { memo } from 'react'
import { Layer, Shape } from 'react-konva'
import type Konva from 'konva'
import type { Viewport } from '../../store/blueprintStore'

interface GridLayerProps {
  width: number
  height: number
  viewport: Viewport
}

const MINOR_GRID = 200    // 2 m — faint lines
const MAJOR_GRID = 1000   // 10 m — brighter lines

const GridLayer = memo(function GridLayer({ width, height, viewport }: GridLayerProps) {
  const { scale, x: ox, y: oy } = viewport

  // World-space bounds of the visible canvas area
  const left   = -ox / scale
  const top    = -oy / scale
  const right  = left + width  / scale
  const bottom = top  + height / scale

  return (
    <Layer listening={false}>
      <Shape
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx: Konva.Context) => {
          const native = ctx._context as CanvasRenderingContext2D

          // ── Minor grid (2 m) ───────────────────────────────────────────
          native.beginPath()
          native.strokeStyle = 'rgba(255,255,255,0.04)'
          native.lineWidth = 0.5 / scale

          const minorStartX = Math.floor(left  / MINOR_GRID) * MINOR_GRID
          const minorStartY = Math.floor(top   / MINOR_GRID) * MINOR_GRID

          for (let x = minorStartX; x <= right;  x += MINOR_GRID) {
            native.moveTo(x, top)
            native.lineTo(x, bottom)
          }
          for (let y = minorStartY; y <= bottom; y += MINOR_GRID) {
            native.moveTo(left, y)
            native.lineTo(right, y)
          }
          native.stroke()

          // ── Major grid (10 m) ──────────────────────────────────────────
          native.beginPath()
          native.strokeStyle = 'rgba(255,255,255,0.12)'
          native.lineWidth = 1 / scale

          const majorStartX = Math.floor(left / MAJOR_GRID) * MAJOR_GRID
          const majorStartY = Math.floor(top  / MAJOR_GRID) * MAJOR_GRID

          for (let x = majorStartX; x <= right;  x += MAJOR_GRID) {
            native.moveTo(x, top)
            native.lineTo(x, bottom)
          }
          for (let y = majorStartY; y <= bottom; y += MAJOR_GRID) {
            native.moveTo(left, y)
            native.lineTo(right, y)
          }
          native.stroke()
        }}
        // x/y/width/height tell Konva the bounding box for this shape
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
      />
    </Layer>
  )
})

export default GridLayer
