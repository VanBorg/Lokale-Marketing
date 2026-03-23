import { memo, useState, useEffect } from 'react'
import { Stage, Layer, Line, Circle, Text } from 'react-konva'
import type Konva from 'konva'
import type { Point } from '../../utils/blueprintGeometry'
import { wallLength, wallAngle, innerAngle, formatLength } from '../../utils/blueprintGeometry'

interface RoomPreviewCanvasProps {
  vertices: Point[]
  onChange?: (vertices: Point[]) => void
  width?: number
  height?: number
}

const PADDING = 20
const VERTEX_RADIUS = 4
const ACCENT = '#35B4D3'

const RoomPreviewCanvas = memo(function RoomPreviewCanvas({
  vertices,
  onChange,
  width = 280,
  height = 200,
}: RoomPreviewCanvasProps) {
  const [localVerts, setLocalVerts] = useState<Point[]>(vertices)

  // Sync when parent changes vertices (new shape chosen or dimensions typed)
  useEffect(() => {
    setLocalVerts(vertices)
  }, [vertices])

  if (!vertices || vertices.length < 3) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dark-border bg-dark/60"
        style={{ width, height }}
      >
        <span className="text-xs text-light/30">Selecteer een vorm</span>
      </div>
    )
  }

  // Auto-fit: compute scale + offset so the room fills the preview with padding
  const xs = localVerts.map(v => v.x)
  const ys = localVerts.map(v => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const roomW = maxX - minX || 1
  const roomH = maxY - minY || 1

  const scale = Math.min(
    (width  - PADDING * 2) / roomW,
    (height - PADDING * 2) / roomH,
    2,
  )

  const offsetX = (width  - roomW * scale) / 2 - minX * scale
  const offsetY = (height - roomH * scale) / 2 - minY * scale

  const toScreen = (p: Point) => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
  })

  const toWorld = (sx: number, sy: number): Point => ({
    x: (sx - offsetX) / scale,
    y: (sy - offsetY) / scale,
  })

  const screenVerts = localVerts.map(toScreen)
  const flatPoints  = screenVerts.flatMap(v => [v.x, v.y])
  const n = localVerts.length

  const handleDragEnd = (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const worldPt = toWorld(e.target.x(), e.target.y())
    const updated = localVerts.map((v, i) => (i === index ? worldPt : v))
    setLocalVerts(updated)
    onChange?.(updated)
  }

  return (
    <div className="rounded-lg border border-dark-border overflow-hidden bg-dark">
      <Stage width={width} height={height}>
        <Layer>
          {/* Room polygon fill + outline */}
          <Line
            points={flatPoints}
            closed
            fill="rgba(53,180,211,0.07)"
            stroke={ACCENT}
            strokeWidth={1.5}
            listening={false}
          />

          {/* Wall-length labels */}
          {screenVerts.map((sv, i) => {
            const next = screenVerts[(i + 1) % n]
            const cx = (sv.x + next.x) / 2
            const cy = (sv.y + next.y) / 2
            const len = wallLength(localVerts[i], localVerts[(i + 1) % n])
            const angle = wallAngle(sv, next)
            // Perpendicular offset so label sits beside the wall, not on it
            const perp = angle - 90
            const ox = Math.cos((perp * Math.PI) / 180) * 13
            const oy = Math.sin((perp * Math.PI) / 180) * 13
            const label = formatLength(len)
            return (
              <Text
                key={`len-${i}`}
                x={cx + ox}
                y={cy + oy}
                text={label}
                fontSize={8}
                fill="rgba(255,255,255,0.55)"
                rotation={angle > 90 || angle < -90 ? angle + 180 : angle}
                align="center"
                offsetX={label.length * 2.8}
                offsetY={4.5}
                listening={false}
              />
            )
          })}

          {/* Inner-angle labels at each vertex */}
          {screenVerts.map((sv, i) => {
            const prev = localVerts[(i - 1 + n) % n]
            const curr = localVerts[i]
            const next = localVerts[(i + 1) % n]
            const deg = innerAngle(prev, curr, next)
            return (
              <Text
                key={`ang-${i}`}
                x={sv.x + 6}
                y={sv.y - 14}
                text={`${deg}°`}
                fontSize={7}
                fill={ACCENT}
                listening={false}
              />
            )
          })}

          {/* Draggable vertex handles */}
          {screenVerts.map((sv, i) => (
            <Circle
              key={`v-${i}`}
              x={sv.x}
              y={sv.y}
              radius={VERTEX_RADIUS}
              fill={ACCENT}
              stroke="#ffffff"
              strokeWidth={1.5}
              draggable={!!onChange}
              onDragEnd={e => handleDragEnd(i, e)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
})

export default RoomPreviewCanvas
