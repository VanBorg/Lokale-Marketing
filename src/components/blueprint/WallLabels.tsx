import { memo } from 'react'
import { Text, Group } from 'react-konva'
import { useBlueprintStore } from '../../store/blueprintStore'
import { wallLength, wallAngle, innerAngle, formatWallLengthMetersLabel } from '../../utils/blueprintGeometry'

interface WallLabelsProps {
  roomId: string
  isSelected: boolean
}

/** Afstand vanaf wand-midden naar buiten (zelfde eenheid als vertices, cm). */
const LABEL_OFFSET_OUT_CM = 60
const ANGLE_INSET_CM = 55
const FONT_SIZE = 11
const FONT_FAMILY = 'DM Sans'
const LABEL_FILL = '#e8eef4'
const LABEL_STROKE = 'rgba(6, 8, 14, 0.42)'
const LENGTH_LOCK = '#fb923c'
const ANGLE_FILL = 'rgba(200, 235, 245, 0.98)'
const ANGLE_STROKE = 'rgba(6, 8, 14, 0.35)'

const WallLabels = memo(function WallLabels({ roomId, isSelected }: WallLabelsProps) {
  const room = useBlueprintStore(s => s.rooms[roomId])
  if (!room || !isSelected) return null

  const verts = room.vertices
  const n = verts.length

  const centroid = {
    x: verts.reduce((s, v) => s + v.x, 0) / n,
    y: verts.reduce((s, v) => s + v.y, 0) / n,
  }

  const outwardFromWallMid = (i: number, dist: number) => {
    const sv = verts[i]
    const next = verts[(i + 1) % n]
    const mid = { x: (sv.x + next.x) / 2, y: (sv.y + next.y) / 2 }
    const dx = next.x - sv.x
    const dy = next.y - sv.y
    const elen = Math.hypot(dx, dy) || 1
    let nx = -dy / elen
    let ny = dx / elen
    const toC = { x: centroid.x - mid.x, y: centroid.y - mid.y }
    if (nx * toC.x + ny * toC.y < 0) {
      nx = -nx
      ny = -ny
    }
    return { x: mid.x - nx * dist, y: mid.y - ny * dist }
  }

  const inwardFromCorner = (i: number, dist: number) => {
    const sv = verts[i]
    const vx = centroid.x - sv.x
    const vy = centroid.y - sv.y
    const vlen = Math.hypot(vx, vy) || 1
    return { x: sv.x + (vx / vlen) * dist, y: sv.y + (vy / vlen) * dist }
  }

  return (
    <Group listening={false}>
      {/* Muurlengtes: meters X,XX — slotjes alleen in Kamer Overview (geen dubbele L/M op plattegrond) */}
      {verts.map((v, i) => {
        const next = verts[(i + 1) % n]
        const angle = wallAngle(v, next)
        const len = wallLength(v, next)
        const pos = outwardFromWallMid(i, LABEL_OFFSET_OUT_CM)
        const label = `${formatWallLengthMetersLabel(len)} m`
        const rot = angle > 90 || angle < -90 ? angle + 180 : angle
        const labelW = Math.max(52, label.length * FONT_SIZE * 0.35)
        const labelH = FONT_SIZE * 1.35
        const lengthLocked = room.lengthLockedWalls?.includes(i) ?? false

        return (
          <Group key={`wall-${i}`} x={pos.x} y={pos.y} rotation={rot}>
            <Text
              x={0}
              y={0}
              offsetX={labelW / 2}
              offsetY={labelH / 2}
              width={labelW}
              height={labelH}
              text={label}
              fontSize={FONT_SIZE}
              fontStyle="normal"
              fontFamily={FONT_FAMILY}
              fill={lengthLocked ? LENGTH_LOCK : LABEL_FILL}
              stroke={lengthLocked ? LENGTH_LOCK : LABEL_STROKE}
              strokeWidth={lengthLocked ? 0.45 : 0.65}
              lineJoin="round"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Group>
        )
      })}

      {/* Hoeken: binnenkant */}
      {isSelected &&
        verts.map((v, i) => {
          const prev = verts[(i - 1 + n) % n]
          const next = verts[(i + 1) % n]
          const ang = innerAngle(prev, v, next)
          const p = inwardFromCorner(i, ANGLE_INSET_CM)
          return (
            <Text
              key={`angle-${i}`}
              x={p.x}
              y={p.y}
              text={`${ang}°`}
              fontSize={10}
              fontStyle="normal"
              fontFamily={FONT_FAMILY}
              fill={ANGLE_FILL}
              stroke={ANGLE_STROKE}
              strokeWidth={0.55}
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
