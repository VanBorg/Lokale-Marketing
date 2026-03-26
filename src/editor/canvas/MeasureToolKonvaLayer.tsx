import { Layer, Circle, Line, Group, Text, Rect } from 'react-konva'
import type { ActiveTool, MeasureLineEntity, Point } from '../../store/blueprintStore'
import { blueprintStore } from '../../store/blueprintStore'
import {
  CM_TO_M,
  MEASURE_FILL,
  MEASURE_LABEL_BG,
  MEASURE_STROKE,
} from './pixelCanvasConstants'

interface MeasureToolKonvaLayerProps {
  measureLines: MeasureLineEntity[]
  measureDraft: { start: Point; hover: Point } | null
  selectedMeasureLineId: string | null
  activeTool: ActiveTool
  viewportScale: number
}

function formatMeasureMetres(m: number): string {
  return `${m.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`
}

function distanceM(start: Point, end: Point): number {
  return (
    Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) * CM_TO_M
  )
}

/** Tekstbreedte in wereld-eenheden (cm), gelijk aan Konva-weergave. */
function measureLabelBoxWidthWorld(
  label: string,
  fontSizeWorld: number,
  viewportScale: number,
): number {
  const vs = Math.max(viewportScale, 1e-6)
  const fontPx = fontSizeWorld * vs
  if (typeof document === 'undefined') {
    return label.length * fontSizeWorld * 0.58
  }
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  ctx.font = `bold ${fontPx}px system-ui, "Segoe UI", sans-serif`
  return ctx.measureText(label).width / vs
}

function MeasureLineVisual({
  id,
  start,
  end,
  selected,
  canPick,
  viewportScale,
}: {
  id?: string
  start: Point
  end: Point
  selected: boolean
  canPick: boolean
  viewportScale: number
}) {
  const vs = Math.max(viewportScale, 1e-6)
  const dotR = 6 / vs
  const lineSw = (selected ? 3.2 : 2.5) / vs
  const dashUnit = 1 / vs
  const dashPattern = [10 * dashUnit, 5 * dashUnit, 2 * dashUnit, 5 * dashUnit]
  const fontSize = 13 / vs
  const padX = 10 / vs
  const padY = 6 / vs

  const m = distanceM(start, end)
  const label = formatMeasureMetres(m)
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2

  const textInnerW = measureLabelBoxWidthWorld(label, fontSize, viewportScale)
  const boxW = textInnerW + padX * 2
  const boxH = fontSize * 1.45 + padY * 2

  const strokeCol = selected ? '#fbbf24' : MEASURE_STROKE
  const fillCol = selected ? '#fb923c' : MEASURE_FILL

  const onPick = (e: { cancelBubble: boolean; evt: { stopPropagation: () => void } }) => {
    if (!canPick || !id) return
    e.cancelBubble = true
    e.evt.stopPropagation()
    blueprintStore.getState().selectMeasureLine(id)
  }

  return (
    <Group>
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke={strokeCol}
        strokeWidth={lineSw}
        lineCap="round"
        lineJoin="round"
        dash={dashPattern}
        listening={canPick}
        hitStrokeWidth={canPick ? 18 / vs : 0}
        onMouseDown={onPick}
        onTap={onPick}
      />

      <Circle
        x={start.x}
        y={start.y}
        radius={dotR}
        fill={fillCol}
        stroke="#fff"
        strokeWidth={1.25 / vs}
        listening={false}
      />
      <Circle
        x={end.x}
        y={end.y}
        radius={dotR}
        fill={fillCol}
        stroke="#fff"
        strokeWidth={1.25 / vs}
        listening={false}
      />

      <Group x={midX} y={midY}>
        <Rect
          x={-boxW / 2}
          y={-boxH / 2}
          width={boxW}
          height={boxH}
          fill={MEASURE_LABEL_BG}
          stroke={strokeCol}
          strokeWidth={1.1 / vs}
          cornerRadius={6 / vs}
          shadowColor="rgba(0,0,0,0.45)"
          shadowBlur={8 / vs}
          shadowOffsetY={2 / vs}
          listening={false}
        />
        <Text
          x={-boxW / 2}
          y={-boxH / 2}
          width={boxW}
          height={boxH}
          text={label}
          fontSize={fontSize}
          fontStyle="bold"
          fontFamily='system-ui, "Segoe UI", sans-serif'
          fill="#fff"
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </Group>
    </Group>
  )
}

export default function MeasureToolKonvaLayer({
  measureLines,
  measureDraft,
  selectedMeasureLineId,
  activeTool,
  viewportScale,
}: MeasureToolKonvaLayerProps) {
  const canPickMeasure = activeTool === 'select'
  const draftLine = measureDraft
    ? { start: measureDraft.start, end: measureDraft.hover }
    : null

  const hasContent = measureLines.length > 0 || draftLine

  if (!hasContent) return null

  return (
    <Layer listening={canPickMeasure}>
      {measureLines.map(line => (
        <MeasureLineVisual
          key={line.id}
          id={line.id}
          start={line.start}
          end={line.end}
          selected={selectedMeasureLineId === line.id}
          canPick={canPickMeasure}
          viewportScale={viewportScale}
        />
      ))}
      {draftLine && (
        <MeasureLineVisual
          start={draftLine.start}
          end={draftLine.end}
          selected={false}
          canPick={false}
          viewportScale={viewportScale}
        />
      )}
    </Layer>
  )
}
