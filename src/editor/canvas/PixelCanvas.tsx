import { Stage, Layer, Rect } from 'react-konva'
import {
  useBlueprintStore,
  useRoomIds,
  useViewport,
  useSnapGuides,
  useGridEnabled,
  useCanvasTextNoteOrder,
  useEditingCanvasTextNoteId,
  useSelectedCanvasTextNoteIds,
  useActiveTool,
  useSelectedDrawingStrokeIndices,
  useMeasureLines,
  useMeasureDraft,
  useSelectedMeasureLineIds,
} from '../../store/blueprintStore'
import { useTheme } from '../../hooks/useTheme'
import EditableRoom from '../../components/blueprint/EditableRoom'
import CanvasTextNotes from '../../components/blueprint/CanvasTextNotes'
import SnapGuides from '../../components/blueprint/SnapGuides'
import BlueprintViewportGridSvg from './BlueprintViewportGridSvg'
import OriginCrossKonva from './OriginCrossKonva'
import DrawingStrokesKonva from './DrawingStrokesKonva'
import MeasureToolKonvaLayer from './MeasureToolKonvaLayer'
import CanvasTextNoteEditorOverlay from './CanvasTextNoteEditorOverlay'
import { usePixelCanvasViewport } from './usePixelCanvasViewport'
import { usePixelCanvasStageInteractions } from './usePixelCanvasStageInteractions'
import { getGridPatternStrokeColors, getOriginCrossPalette } from './pixelCanvasTheme'

export default function PixelCanvas() {
  const { containerRef, stageRef, size, handleChildDragStart, handleChildDragEnd } =
    usePixelCanvasViewport()

  const {
    cursorStyle,
    marqueeWorld,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleStageClick,
    handleStageDblClick,
  } = usePixelCanvasStageInteractions({ stageRef, size })

  const roomIds = useRoomIds()
  const viewport = useViewport()
  const canvasTextNotes = useBlueprintStore(s => s.canvasTextNotes)
  const canvasTextNoteOrder = useCanvasTextNoteOrder()
  const editingCanvasTextNoteId = useEditingCanvasTextNoteId()
  const selectedCanvasTextNoteIds = useSelectedCanvasTextNoteIds()
  const activeTool = useActiveTool()
  const selectedDrawingStrokeIndices = useSelectedDrawingStrokeIndices()
  const measureLines = useMeasureLines()
  const measureDraft = useMeasureDraft()
  const selectedMeasureLineIds = useSelectedMeasureLineIds()
  const snapGuides = useSnapGuides()
  const gridEnabled = useGridEnabled()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const originPalette = getOriginCrossPalette(isLight)
  const gridStroke = getGridPatternStrokeColors(isLight)

  const drawingStrokes = useBlueprintStore(s => s.drawingStrokes)

  const hasSize = size.width > 0 && size.height > 0

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-dark overflow-hidden"
      style={{ cursor: cursorStyle }}
    >
      {hasSize && gridEnabled && (
        <BlueprintViewportGridSvg viewport={viewport} gridStroke={gridStroke} />
      )}

      {hasSize && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          onDblClick={handleStageDblClick}
          onDragStart={handleChildDragStart}
          onDragEnd={handleChildDragEnd}
        >
          <OriginCrossKonva palette={originPalette} />

          <Layer>
            {roomIds.map(id => (
              <EditableRoom key={id} roomId={id} stageRef={stageRef} />
            ))}

            <DrawingStrokesKonva
              strokes={drawingStrokes}
              viewportScale={viewport.scale}
              activeTool={activeTool}
              selectedStrokeIndices={selectedDrawingStrokeIndices}
            />

            {marqueeWorld && (
              <Rect
                x={marqueeWorld.minX}
                y={marqueeWorld.minY}
                width={marqueeWorld.maxX - marqueeWorld.minX}
                height={marqueeWorld.maxY - marqueeWorld.minY}
                fill="rgba(53,180,211,0.08)"
                stroke="#35B4D3"
                strokeWidth={Math.max(1, 1 / viewport.scale)}
                dash={[6 / viewport.scale, 4 / viewport.scale]}
                listening={false}
              />
            )}
          </Layer>

          {/* Eigen laag boven kamers — betrouwbare hit-testing voor tekst selecteren/verwijderen */}
          <Layer>
            <CanvasTextNotes
              noteOrder={canvasTextNoteOrder}
              notes={canvasTextNotes}
              viewportScale={viewport.scale}
              editingId={editingCanvasTextNoteId}
              selectedIds={selectedCanvasTextNoteIds}
              isLight={isLight}
              activeTool={activeTool}
            />
          </Layer>

          <MeasureToolKonvaLayer
            measureLines={measureLines}
            measureDraft={measureDraft}
            selectedMeasureLineIds={selectedMeasureLineIds}
            activeTool={activeTool}
            viewportScale={viewport.scale}
          />

          <Layer listening={false}>
            <SnapGuides guides={snapGuides} />
          </Layer>
        </Stage>
      )}

      {hasSize && (
        <CanvasTextNoteEditorOverlay
          editingId={editingCanvasTextNoteId}
          note={
            editingCanvasTextNoteId
              ? canvasTextNotes[editingCanvasTextNoteId]
              : undefined
          }
          viewport={viewport}
        />
      )}
    </div>
  )
}
