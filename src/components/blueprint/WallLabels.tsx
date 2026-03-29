import { memo } from 'react'
import { Text, Group, Line, Rect } from 'react-konva'
import { useBlueprintStore, useViewport } from '../../store/blueprintStore'
import {
  formatWallLengthMetersLabel,
  roomAxisAlignedBounds,
} from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'

interface WallLabelsProps {
  roomId: string
  isSelected: boolean
}

const FONT_FAMILY = 'system-ui, "Segoe UI", sans-serif'
/** Afstand van de kamer-bbox tot de maatlijn (cm, wereld). */
const GAP_CM = 72
/** Halve tick loodrecht op de maatlijn (cm). */
const TICK_HALF_CM = 20
const ACCENT = '#35B4D3'

/**
 * Alleen bij geselecteerde kamer: totaal **breedte** (links–rechts) en **diepte** (boven–onder)
 * langs de buitenkant van de as-bounding box — geen per-wandmaten, geen hoekgraden (die staan op de Kamerkaart).
 */
const WallLabels = memo(function WallLabels({ roomId, isSelected }: WallLabelsProps) {
  const room = useBlueprintStore(s => s.rooms[roomId])
  const viewport = useViewport()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  if (!room || !isSelected) return null

  const verts = room.vertices
  if (verts.length < 3) return null

  const b = roomAxisAlignedBounds(verts)
  if (!b) return null

  const wCm = b.maxX - b.minX
  const hCm = b.maxY - b.minY
  const scale = viewport.scale || 1

  const dimStroke = isLight ? '#0e7490' : ACCENT
  const extStroke = isLight ? 'rgba(14,116,144,0.45)' : 'rgba(53,180,211,0.5)'
  const labelFill = isLight ? '#0f172a' : '#f1f5f9'
  const labelBg = isLight ? 'rgba(255,255,255,0.97)' : 'rgba(13,15,22,0.95)'
  const labelBorder = isLight ? 'rgba(14,116,144,0.45)' : 'rgba(53,180,211,0.55)'

  const hairline = Math.max(1.4, 2.2 / scale)
  const extLine = Math.max(1, 1.4 / scale)
  const dash = [6 / scale, 4 / scale] as [number, number]
  const fontSize = Math.min(40, Math.max(13, 20 / scale))
  const tickHalf = Math.min(TICK_HALF_CM, Math.max(12, TICK_HALF_CM / scale))
  const padX = Math.max(4, 6 / scale)
  const padY = Math.max(3, 5 / scale)
  const radius = Math.max(3, 4 / scale)

  const yTopDim = b.minY - GAP_CM
  const xLeftDim = b.minX - GAP_CM

  const labelW = (text: string) => Math.max(56, text.length * fontSize * 0.58)
  const labelH = fontSize * 1.5

  const widthLabel = `${formatWallLengthMetersLabel(wCm)} m`
  const depthLabel = `${formatWallLengthMetersLabel(hCm)} m`

  const midTopX = (b.minX + b.maxX) / 2
  const midLeftY = (b.minY + b.maxY) / 2

  return (
    <Group listening={false}>
      {/* ── Totaalbreedte: horizontale maatlijn boven de kamer ── */}
      <Group>
        <Line
          points={[b.minX, b.minY, b.minX, yTopDim]}
          stroke={extStroke}
          strokeWidth={extLine}
          dash={dash}
          lineCap="round"
          listening={false}
        />
        <Line
          points={[b.maxX, b.minY, b.maxX, yTopDim]}
          stroke={extStroke}
          strokeWidth={extLine}
          dash={dash}
          lineCap="round"
          listening={false}
        />
        <Line
          points={[b.minX, yTopDim, b.maxX, yTopDim]}
          stroke={dimStroke}
          strokeWidth={hairline}
          lineCap="square"
          listening={false}
        />
        <Line
          points={[
            b.minX, yTopDim - tickHalf,
            b.minX, yTopDim + tickHalf,
          ]}
          stroke={dimStroke}
          strokeWidth={hairline * 1.4}
          lineCap="square"
          listening={false}
        />
        <Line
          points={[
            b.maxX, yTopDim - tickHalf,
            b.maxX, yTopDim + tickHalf,
          ]}
          stroke={dimStroke}
          strokeWidth={hairline * 1.4}
          lineCap="square"
          listening={false}
        />
        <Group x={midTopX} y={yTopDim}>
          <Rect
            x={-(labelW(widthLabel) / 2 + padX)}
            y={-(labelH / 2 + padY)}
            width={labelW(widthLabel) + padX * 2}
            height={labelH + padY * 2}
            cornerRadius={radius}
            fill={labelBg}
            stroke={labelBorder}
            strokeWidth={extLine * 1.1}
            listening={false}
          />
          <Text
            x={-labelW(widthLabel) / 2}
            y={-labelH / 2}
            width={labelW(widthLabel)}
            height={labelH}
            text={widthLabel}
            fontSize={fontSize}
            fontStyle="bold"
            fontFamily={FONT_FAMILY}
            fill={labelFill}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      </Group>

      {/* ── Totaaldiepte: verticale maatlijn links van de kamer ── */}
      <Group>
        <Line
          points={[b.minX, b.minY, xLeftDim, b.minY]}
          stroke={extStroke}
          strokeWidth={extLine}
          dash={dash}
          lineCap="round"
          listening={false}
        />
        <Line
          points={[b.minX, b.maxY, xLeftDim, b.maxY]}
          stroke={extStroke}
          strokeWidth={extLine}
          dash={dash}
          lineCap="round"
          listening={false}
        />
        <Line
          points={[xLeftDim, b.minY, xLeftDim, b.maxY]}
          stroke={dimStroke}
          strokeWidth={hairline}
          lineCap="square"
          listening={false}
        />
        <Line
          points={[
            xLeftDim - tickHalf, b.minY,
            xLeftDim + tickHalf, b.minY,
          ]}
          stroke={dimStroke}
          strokeWidth={hairline * 1.4}
          lineCap="square"
          listening={false}
        />
        <Line
          points={[
            xLeftDim - tickHalf, b.maxY,
            xLeftDim + tickHalf, b.maxY,
          ]}
          stroke={dimStroke}
          strokeWidth={hairline * 1.4}
          lineCap="square"
          listening={false}
        />
        <Group x={xLeftDim} y={midLeftY} rotation={-90}>
          <Rect
            x={-(labelW(depthLabel) / 2 + padX)}
            y={-(labelH / 2 + padY)}
            width={labelW(depthLabel) + padX * 2}
            height={labelH + padY * 2}
            cornerRadius={radius}
            fill={labelBg}
            stroke={labelBorder}
            strokeWidth={extLine * 1.1}
            listening={false}
          />
          <Text
            x={-labelW(depthLabel) / 2}
            y={-labelH / 2}
            width={labelW(depthLabel)}
            height={labelH}
            text={depthLabel}
            fontSize={fontSize}
            fontStyle="bold"
            fontFamily={FONT_FAMILY}
            fill={labelFill}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      </Group>
    </Group>
  )
})

export default WallLabels
