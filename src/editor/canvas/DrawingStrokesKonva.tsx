import { Circle, Line } from 'react-konva'
import type { ActiveTool, Point } from '../../store/blueprintStore'
import { blueprintStore } from '../../store/blueprintStore'

interface DrawingStrokesKonvaProps {
  strokes: Point[][]
  viewportScale: number
  activeTool: ActiveTool
  selectedStrokeIndex: number | null
}

export default function DrawingStrokesKonva({
  strokes,
  viewportScale,
  activeTool,
  selectedStrokeIndex,
}: DrawingStrokesKonvaProps) {
  const canPickStroke = activeTool === 'select'

  return (
    <>
      {strokes.map((stroke, si) =>
        stroke.length >= 2 ? (
          <Line
            key={`draw-stroke-${si}`}
            points={stroke.flatMap(v => [v.x, v.y])}
            stroke={selectedStrokeIndex === si ? '#f59e0b' : '#35B4D3'}
            strokeWidth={(selectedStrokeIndex === si ? 3 : 2) / viewportScale}
            lineCap="round"
            lineJoin="round"
            listening={canPickStroke}
            onMouseDown={e => {
              if (!canPickStroke) return
              e.cancelBubble = true
              e.evt.stopPropagation()
              blueprintStore.getState().selectDrawingStroke(si)
            }}
            onTap={e => {
              if (!canPickStroke) return
              e.cancelBubble = true
              e.evt.stopPropagation()
              blueprintStore.getState().selectDrawingStroke(si)
            }}
          />
        ) : null,
      )}
      {strokes.map((stroke, si) =>
        stroke.map((v, vi) => (
          <Circle
            key={`draw-pt-${si}-${vi}`}
            x={v.x}
            y={v.y}
            radius={4}
            fill="#35B4D3"
            stroke="#fff"
            strokeWidth={1}
            listening={false}
          />
        )),
      )}
    </>
  )
}
