import { memo } from 'react'
import { Group, Text } from 'react-konva'
import { useViewport } from '../../store/blueprintStore'
import { polygonCentroid } from '../../utils/blueprintGeometry'
import type { Point } from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'

interface RoomPlanLabelProps {
  vertices: Point[]
  roomName: string
  icon: string
}

const FONT = 'system-ui, "Segoe UI", sans-serif'
const FONT_EMOJI = 'system-ui, "Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", sans-serif'

/** Centraal: icoon (functie) + kamernaam; leesbaar op gekleurde vulling. */
const RoomPlanLabel = memo(function RoomPlanLabel({
  vertices,
  roomName,
  icon,
}: RoomPlanLabelProps) {
  const viewport = useViewport()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const c = polygonCentroid(vertices)
  if (!c) return null

  const scale = viewport.scale || 1
  /** Groter op scherm: world-font schaalt met 1/scale; hogere caps dan voorheen. */
  const iconSize = Math.min(72, Math.max(22, 40 / scale))
  const nameSize = Math.min(52, Math.max(16, 28 / scale))
  const gap = Math.max(8, 12 / scale)
  const maxW = Math.min(640, Math.max(160, 360 / scale))
  const nameBlockH = nameSize * 2.6

  const textFill = isLight ? '#0f172a' : '#f8fafc'
  const shadow = isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.55)'

  const displayName = roomName.trim() || 'Ruimte'

  const totalH = (icon ? iconSize + gap : 0) + nameBlockH
  const topY = -totalH / 2

  return (
    <Group x={c.x} y={c.y} listening={false}>
      {icon ? (
        <Text
          text={icon}
          fontSize={iconSize}
          fontFamily={FONT_EMOJI}
          fill={textFill}
          align="center"
          verticalAlign="top"
          width={maxW}
          x={-maxW / 2}
          y={topY}
          shadowColor={shadow}
          shadowBlur={3}
          shadowOffset={{ x: 0, y: 0 }}
          listening={false}
        />
      ) : null}
      <Text
        text={displayName}
        fontSize={nameSize}
        fontStyle="bold"
        fontFamily={FONT}
        fill={textFill}
        align="center"
        verticalAlign="top"
        width={maxW}
        height={nameBlockH}
        x={-maxW / 2}
        y={topY + (icon ? iconSize + gap : 0)}
        wrap="word"
        shadowColor={shadow}
        shadowBlur={3}
        listening={false}
      />
    </Group>
  )
})

export default RoomPlanLabel
