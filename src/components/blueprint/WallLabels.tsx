import { memo } from 'react'
import { Text, Group } from 'react-konva'
import { useBlueprintStore } from '../../store/blueprintStore'
import { wallLength, wallAngle, innerAngle, formatLength } from '../../utils/blueprintGeometry'

interface WallLabelsProps {
  roomId: string
  isSelected: boolean
}

const LABEL_OFFSET = 18
const FONT_SIZE = 11
const FONT_FAMILY = 'DM Sans'
const LABEL_FILL = 'rgba(255,255,255,0.7)'
const ANGLE_FILL = '#35B4D3'

const WallLabels = memo(function WallLabels({ roomId, isSelected }: WallLabelsProps) {
  const room = useBlueprintStore(s => s.rooms[roomId])
  if (!room || !isSelected) return null

  const verts = room.vertices
  const n = verts.length

  return (
    <Group listening={false}>
      {/* Wall length labels */}
      {verts.map((v, i) => {
        const next = verts[(i + 1) % n]
        const cx = (v.x + next.x) / 2
        const cy = (v.y + next.y) / 2
        const angle = wallAngle(v, next)
        const len = wallLength(v, next)

        // Perpendicular offset direction
        const perpAngle = angle - 90
        const ox = Math.cos((perpAngle * Math.PI) / 180) * LABEL_OFFSET
        const oy = Math.sin((perpAngle * Math.PI) / 180) * LABEL_OFFSET

        return (
          <Text
            key={`wall-${i}`}
            x={cx + ox}
            y={cy + oy}
            text={formatLength(len)}
            fontSize={FONT_SIZE}
            fontFamily={FONT_FAMILY}
            fill={LABEL_FILL}
            rotation={angle > 90 || angle < -90 ? angle + 180 : angle}
            align="center"
            offsetX={formatLength(len).length * 3}
            offsetY={FONT_SIZE / 2}
          />
        )
      })}

      {/* Corner angle labels */}
      {isSelected &&
        verts.map((v, i) => {
          const prev = verts[(i - 1 + n) % n]
          const next = verts[(i + 1) % n]
          const angle = innerAngle(prev, v, next)
          return (
            <Text
              key={`angle-${i}`}
              x={v.x + 10}
              y={v.y - 16}
              text={`${angle}°`}
              fontSize={9}
              fontFamily={FONT_FAMILY}
              fill={ANGLE_FILL}
            />
          )
        })}
    </Group>
  )
})

export default WallLabels
