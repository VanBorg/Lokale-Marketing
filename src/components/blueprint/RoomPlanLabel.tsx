import { memo, useMemo } from 'react'
import { Group, Text } from 'react-konva'
import { useViewport } from '../../store/blueprintStore'
import { polygonCentroid, roomPlanLabelAnchor } from '../../utils/blueprintGeometry'
import type { Point } from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'

interface RoomPlanLabelProps {
  vertices: Point[]
  roomName: string
  icon: string
  shape?: string
}

const FONT = 'system-ui, "Segoe UI", sans-serif'
const FONT_EMOJI = 'system-ui, "Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", sans-serif'

/** Viewport-schaal begrenzen voor voorspelbare labelgrootte op het scherm. */
const SCALE_MIN = 0.12
const SCALE_MAX = 12

const RoomPlanLabel = memo(function RoomPlanLabel({
  vertices,
  roomName,
  icon,
  shape,
}: RoomPlanLabelProps) {
  const viewport = useViewport()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const anchor = useMemo(
    () => roomPlanLabelAnchor(vertices, shape) ?? polygonCentroid(vertices),
    [vertices, shape],
  )
  if (!anchor) return null

  const scale = Math.max(SCALE_MIN, Math.min(viewport.scale || 1, SCALE_MAX))
  const iconSize = Math.min(50, Math.max(20, 32 / scale))
  const nameSize = Math.min(36, Math.max(13, 20 / scale))
  const gap = Math.max(3, 6 / scale)
  const colW = Math.min(360, Math.max(96, 200 / scale))

  const textFill = isLight ? '#0f172a' : '#f8fafc'
  const shadow = isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.55)'

  const displayName = roomName.trim() || 'Ruimte'
  const iconText = icon?.trim() ?? ''
  const showIcon = iconText.length > 0

  const iconRowH = iconSize * 1.2
  const nameBlockH = nameSize * 3.4
  const totalH = (showIcon ? iconRowH + gap : 0) + nameBlockH
  const topY = -totalH / 2
  const nameY = topY + (showIcon ? iconRowH + gap : 0)

  return (
    <Group x={anchor.x} y={anchor.y} listening={false}>
      {showIcon ? (
        <Text
          text={iconText}
          fontSize={iconSize}
          fontFamily={FONT_EMOJI}
          fill={textFill}
          align="center"
          verticalAlign="middle"
          width={colW}
          height={iconRowH}
          x={-colW / 2}
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
        width={colW}
        height={nameBlockH}
        x={-colW / 2}
        y={nameY}
        wrap="word"
        shadowColor={shadow}
        shadowBlur={3}
        listening={false}
      />
    </Group>
  )
})

export default RoomPlanLabel
