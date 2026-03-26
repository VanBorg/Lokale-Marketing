import { memo } from 'react'
import { Text, Group, Line, Rect } from 'react-konva'
import { useBlueprintStore, useViewport } from '../../store/blueprintStore'
import type { Point } from '../../utils/blueprintGeometry'
import {
  wallLength,
  wallAngle,
  innerAngle,
  formatWallLengthMetersLabel,
} from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'

interface WallLabelsProps {
  roomId: string
  isSelected: boolean
}

const FONT_FAMILY = 'system-ui, "Segoe UI", sans-serif'
const ANGLE_INSET_CM = 46
/** Minimum wand voor een maatlijn (cm). */
const MIN_WALL_CM = 40
/** Hoe ver de maatlijn buiten de wand staat (cm, wereld). */
const DIM_OFFSET_CM = 72
/** Halve ticklengte loodrecht op de wand (cm). */
const TICK_HALF_CM = 20
const ACCENT = '#35B4D3'
const LENGTH_LOCK = '#fb923c'

/** Berekent de naar-buiten normaal voor wand i. */
function wallNormal(
  verts: Point[],
  i: number,
  centroid: Point,
): { v0: Point; v1: Point; nx: number; ny: number; angleDeg: number } {
  const n = verts.length
  const v0 = verts[i]
  const v1 = verts[(i + 1) % n]
  const dx = v1.x - v0.x
  const dy = v1.y - v0.y
  const elen = Math.hypot(dx, dy) || 1
  let nx = -dy / elen
  let ny = dx / elen
  const mid = { x: (v0.x + v1.x) / 2, y: (v0.y + v1.y) / 2 }
  const toC = { x: centroid.x - mid.x, y: centroid.y - mid.y }
  // Draai naar buiten (weg van centroïde)
  if (nx * toC.x + ny * toC.y > 0) { nx = -nx; ny = -ny }
  return { v0, v1, nx, ny, angleDeg: wallAngle(v0, v1) }
}

const WallLabels = memo(function WallLabels({ roomId, isSelected }: WallLabelsProps) {
  const room = useBlueprintStore(s => s.rooms[roomId])
  const viewport = useViewport()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // Alleen tekenen wanneer de kamer geselecteerd is
  if (!room || !isSelected) return null

  const verts = room.vertices
  const n = verts.length
  if (n < 3) return null

  const scale = viewport.scale || 1

  // ── Kleuren ────────────────────────────────────────────────────────────────
  const dimStroke  = isLight ? '#0e7490'                   : ACCENT
  const extStroke  = isLight ? 'rgba(14,116,144,0.45)'     : 'rgba(53,180,211,0.5)'
  const labelFill  = isLight ? '#0f172a'                   : '#f1f5f9'
  const labelBg    = isLight ? 'rgba(255,255,255,0.97)'    : 'rgba(13,15,22,0.95)'
  const labelBorder = isLight ? 'rgba(14,116,144,0.45)'   : 'rgba(53,180,211,0.55)'
  const angleFill  = isLight ? 'rgba(15,23,42,0.9)'       : 'rgba(200,235,245,0.98)'
  const angleStroke = isLight ? 'rgba(255,255,255,0.7)'   : 'rgba(6,8,14,0.4)'

  const centroid = {
    x: verts.reduce((s, v) => s + v.x, 0) / n,
    y: verts.reduce((s, v) => s + v.y, 0) / n,
  }

  const inwardFromCorner = (i: number, dist: number) => {
    const sv = verts[i]
    const vx = centroid.x - sv.x
    const vy = centroid.y - sv.y
    const vlen = Math.hypot(vx, vy) || 1
    return { x: sv.x + (vx / vlen) * dist, y: sv.y + (vy / vlen) * dist }
  }

  /** Schaalafhankelijke maten (zodat ze niet enorm worden bij ver uitzoomen). */
  const hairline  = Math.max(1.2, 1.8 / scale)
  const extLine   = Math.max(0.8, 1.2 / scale)
  const dash      = [6 / scale, 4 / scale] as [number, number]
  const fontSize  = Math.min(22, Math.max(11, 16 / scale))
  const tickHalf  = Math.min(TICK_HALF_CM, Math.max(14, TICK_HALF_CM / scale))
  const padX      = Math.max(6, 10 / scale)
  const padY      = Math.max(4, 6 / scale)
  const radius    = Math.max(3, 5 / scale)

  return (
    <Group listening={false}>
      {/* Maatlijnen per wand */}
      {verts.map((_, i) => {
        const lenCm = wallLength(verts[i], verts[(i + 1) % n])
        if (lenCm < MIN_WALL_CM) return null

        const { v0, v1, nx, ny, angleDeg } = wallNormal(verts, i, centroid)
        const locked = room.lockedWalls?.includes(i) ?? false

        const stroke = locked ? LENGTH_LOCK : dimStroke
        const extC   = locked ? 'rgba(249,115,22,0.6)' : extStroke

        // Punten op de maatlijn
        const p0 = { x: v0.x + nx * DIM_OFFSET_CM, y: v0.y + ny * DIM_OFFSET_CM }
        const p1 = { x: v1.x + nx * DIM_OFFSET_CM, y: v1.y + ny * DIM_OFFSET_CM }
        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }

        // Draai zodat tekst nooit ondersteboven staat
        const rot = angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg

        const label   = `${formatWallLengthMetersLabel(lenCm)} m`
        const labelW  = Math.max(60, label.length * fontSize * 0.55)
        const labelH  = fontSize * 1.6

        return (
          <Group key={`dim-${i}`}>
            {/* Hulplijn v0 → p0 */}
            <Line
              points={[v0.x, v0.y, p0.x, p0.y]}
              stroke={extC}
              strokeWidth={extLine}
              dash={dash}
              lineCap="round"
              listening={false}
            />
            {/* Hulplijn v1 → p1 */}
            <Line
              points={[v1.x, v1.y, p1.x, p1.y]}
              stroke={extC}
              strokeWidth={extLine}
              dash={dash}
              lineCap="round"
              listening={false}
            />
            {/* Hoofdmaatlijn */}
            <Line
              points={[p0.x, p0.y, p1.x, p1.y]}
              stroke={stroke}
              strokeWidth={hairline}
              lineCap="square"
              listening={false}
            />
            {/* Eindtick bij p0 */}
            <Line
              points={[
                p0.x - nx * tickHalf, p0.y - ny * tickHalf,
                p0.x + nx * tickHalf, p0.y + ny * tickHalf,
              ]}
              stroke={stroke}
              strokeWidth={hairline * 1.4}
              lineCap="square"
              listening={false}
            />
            {/* Eindtick bij p1 */}
            <Line
              points={[
                p1.x - nx * tickHalf, p1.y - ny * tickHalf,
                p1.x + nx * tickHalf, p1.y + ny * tickHalf,
              ]}
              stroke={stroke}
              strokeWidth={hairline * 1.4}
              lineCap="square"
              listening={false}
            />
            {/* Label-pill op het midden van de maatlijn */}
            <Group x={mid.x} y={mid.y} rotation={rot}>
              <Rect
                x={-(labelW / 2 + padX)}
                y={-(labelH / 2 + padY)}
                width={labelW + padX * 2}
                height={labelH + padY * 2}
                cornerRadius={radius}
                fill={labelBg}
                stroke={locked ? LENGTH_LOCK : labelBorder}
                strokeWidth={extLine * 1.1}
                listening={false}
              />
              <Text
                x={-labelW / 2}
                y={-labelH / 2}
                width={labelW}
                height={labelH}
                text={label}
                fontSize={fontSize}
                fontStyle="bold"
                fontFamily={FONT_FAMILY}
                fill={locked ? LENGTH_LOCK : labelFill}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          </Group>
        )
      })}

      {/* Hoekhoeken — binnenzijde */}
      {verts.map((v, i) => {
        const prev = verts[(i - 1 + n) % n]
        const next = verts[(i + 1) % n]
        const ang  = innerAngle(prev, v, next)
        const p    = inwardFromCorner(i, ANGLE_INSET_CM)
        return (
          <Text
            key={`angle-${i}`}
            x={p.x}
            y={p.y}
            text={`${ang}°`}
            fontSize={Math.min(18, Math.max(9, 12 / scale))}
            fontStyle="bold"
            fontFamily={FONT_FAMILY}
            fill={angleFill}
            stroke={angleStroke}
            strokeWidth={0.6}
            lineJoin="round"
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        )
      })}
    </Group>
  )
})

export default WallLabels
