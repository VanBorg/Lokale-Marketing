import { Circle, Line } from 'react-konva'
import type { ActiveTool, Point } from '../../store/blueprintStore'
import { blueprintStore } from '../../store/blueprintStore'

interface DrawingStrokesKonvaProps {
  strokes: Point[][]
  viewportScale: number
  activeTool: ActiveTool
  selectedStrokeIndices: number[]
}

export default function DrawingStrokesKonva({
  strokes,
  viewportScale,
  activeTool,
  selectedStrokeIndices,
}: DrawingStrokesKonvaProps) {
  const canPickStroke = activeTool === 'select'
  const selSet = new Set(selectedStrokeIndices)

  return (
    <>
      {strokes.map((stroke, si) =>
        stroke.length >= 2 ? (
          <Line
            key={`draw-stroke-${si}`}
            points={stroke.flatMap(v => [v.x, v.y])}
            stroke={selSet.has(si) ? '#f59e0b' : '#35B4D3'}
            strokeWidth={(selSet.has(si) ? 3 : 2) / viewportScale}
            lineCap="round"
            lineJoin="round"
            listening={canPickStroke}
            onMouseDown={e => {
              if (!canPickStroke) return
              e.cancelBubble = true
              e.evt.stopPropagation()
              const evt = e.evt as MouseEvent
              const store = blueprintStore.getState()
              if (evt.ctrlKey || evt.metaKey) {
                store.toggleDrawingStrokeInSelection(si)
              } else if (evt.shiftKey) {
                store.addDrawingStrokeToSelection(si)
              } else if (store.selectedDrawingStrokeIndices.includes(si)) {
                return
              } else {
                store.selectDrawingStroke(si)
              }
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
