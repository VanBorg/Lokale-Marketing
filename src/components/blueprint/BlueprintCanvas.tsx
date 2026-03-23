import { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Circle, Line, Group } from 'react-konva'
import type Konva from 'konva'
import {
  useBlueprintStore,
  useRoomIds,
  useActiveTool,
  useViewport,
  useSnapGuides,
  blueprintStore,
} from '../../store/blueprintStore'
import { snapPointToGrid } from '../../utils/blueprintGeometry'
import EditableRoom from './EditableRoom'
import SnapGuides from './SnapGuides'
import GridLayer from './GridLayer'

const MIN_SCALE = 0.1
const MAX_SCALE = 8
const ZOOM_FACTOR = 1.08

export default function BlueprintCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })

  const roomIds = useRoomIds()
  const activeTool = useActiveTool()
  const viewport = useViewport()
  const snapGuides = useSnapGuides()

  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const spaceDown = useRef(false)

  // Responsive resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Space key for pan mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceDown.current) {
        spaceDown.current = true
        if (containerRef.current) containerRef.current.style.cursor = 'grab'
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false
        if (containerRef.current) containerRef.current.style.cursor = 'crosshair'
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Wheel zoom — zoom toward cursor position
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const direction = e.evt.deltaY < 0 ? 1 : -1
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * Math.pow(ZOOM_FACTOR, direction)))

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }
    blueprintStore.getState().setViewport({ scale: newScale, x: newPos.x, y: newPos.y })
  }, [])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Pan: space+drag or middle mouse
    if (spaceDown.current || e.evt.button === 1) {
      isPanning.current = true
      panStart.current = { x: e.evt.clientX, y: e.evt.clientY }
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
      return
    }

    const store = blueprintStore.getState()
    if (e.target === stageRef.current) store.clearSelection()
  }, [])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning.current) return
    const dx = e.evt.clientX - panStart.current.x
    const dy = e.evt.clientY - panStart.current.y
    panStart.current = { x: e.evt.clientX, y: e.evt.clientY }
    const { viewport: vp } = blueprintStore.getState()
    blueprintStore.getState().setViewport({ x: vp.x + dx, y: vp.y + dy })
  }, [])

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false
      if (containerRef.current)
        containerRef.current.style.cursor = spaceDown.current ? 'grab' : 'crosshair'
    }
  }, [])

  // Click on stage background — place drawing vertex
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    if (isPanning.current) return
    const store = blueprintStore.getState()
    if (store.activeTool !== 'draw') return

    const stage = stageRef.current!
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const scale = stage.scaleX()
    const worldPt = {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale,
    }
    store.addDrawingVertex(snapPointToGrid(worldPt))
  }, [])

  const handleStageDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    const store = blueprintStore.getState()
    if (store.activeTool === 'draw') store.finishDrawing()
  }, [])

  // Preview vertex while drawing
  const drawingVerts = useBlueprintStore(s => s.drawingVertices)

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full bg-dark overflow-hidden"
      style={{ cursor: activeTool === 'draw' ? 'crosshair' : 'default' }}
    >
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
      >
        {/* Layer 1: Static grid — never rerenders during interaction */}
        <GridLayer width={size.width} height={size.height} viewport={viewport} />

        {/* Layer 2: Rooms and elements */}
        <Layer>
          {roomIds.map(id => (
            <EditableRoom key={id} roomId={id} stageRef={stageRef} />
          ))}

          {/* Drawing preview dots */}
          {drawingVerts.map((v, i) => (
            <Circle
              key={i}
              x={v.x}
              y={v.y}
              radius={4}
              fill="#35B4D3"
              stroke="#fff"
              strokeWidth={1}
              listening={false}
            />
          ))}
        </Layer>

        {/* Layer 3: UI overlays — snap guides + center cross */}
        <Layer listening={false}>
          <SnapGuides guides={snapGuides} />
          {/* World origin cross — always at (0,0) in world space.
              Arm size and stroke compensated for zoom so it stays 20px on screen. */}
          <Group listening={false}>
            <Line
              points={[
                -20 / viewport.scale, 0,
                 20 / viewport.scale, 0,
              ]}
              stroke="#00D4D4"
              strokeWidth={1.5 / viewport.scale}
              opacity={0.8}
            />
            <Line
              points={[
                0, -20 / viewport.scale,
                0,  20 / viewport.scale,
              ]}
              stroke="#00D4D4"
              strokeWidth={1.5 / viewport.scale}
              opacity={0.8}
            />
            <Circle
              x={0}
              y={0}
              radius={3 / viewport.scale}
              fill="#00D4D4"
              opacity={0.8}
            />
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}
