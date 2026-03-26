import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { Stage, Layer, Circle, Line, Group, Text } from 'react-konva'
import type Konva from 'konva'
import {
  blueprintStore,
  useBlueprintStore,
  useRoomIds,
  useActiveTool,
  useViewport,
  useSnapGuides,
  useGridEnabled,
} from '../../store/blueprintStore'
import type { Point } from '../../store/blueprintStore'
import { snapPointToGrid } from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'
import EditableRoom from '../../components/blueprint/EditableRoom'
import SnapGuides from '../../components/blueprint/SnapGuides'

const MINOR_GRID = 200   // 2 m in world units (cm)
const MAJOR_GRID = 1000  // 10 m in world units (cm)
/** Origin cross: 6 m total per axis; half = 1.5 × minor grid step (300 cm) */
const ORIGIN_CROSS_HALF = MINOR_GRID * 1.5
const ORIGIN_GLOW_OUTER = Math.round(ORIGIN_CROSS_HALF * 1.1)
const ORIGIN_GLOW_MID = Math.round(ORIGIN_CROSS_HALF * 1.05)

/** 1 px = 0.01 m (canvas world unit is cm) */
const CM_TO_M = 0.01

/** After project open, RO often fires many times as layout settles — recentre on each until quiet. */
const RECENTER_AFTER_OPEN_MS = 150

interface MeasureLine {
  start: Point
  end: Point
}

export default function PixelCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [isPanningUi, setIsPanningUi] = useState(false)

  const roomIds = useRoomIds()
  const projectId = useBlueprintStore(s => s.projectId)
  const activeTool = useActiveTool()
  const viewport = useViewport()
  const snapGuides = useSnapGuides()
  const gridEnabled = useGridEnabled()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // ── Measure tool state ─────────────────────────────────────────────────────
  const [measureStart, setMeasureStart] = useState<Point | null>(null)
  const [measureLine, setMeasureLine] = useState<MeasureLine | null>(null)

  // Reset measure state when switching away from measure tool
  useEffect(() => {
    if (activeTool !== 'measure') {
      setMeasureStart(null)
      setMeasureLine(null)
    }
  }, [activeTool])

  // ── Theme colours ──────────────────────────────────────────────────────────
  const originCross = isLight
    ? {
        underlay: 'rgba(14,116,144,0.42)',
        mid: 'rgba(8,95,120,0.55)',
        main: '#0e7490',
        shadow: 'rgba(14,116,144,0.55)',
        centreFill: '#1e293b',
        centreStroke: '#0891b2',
        ring: '#0e7490',
        ringOpacity: 0.55,
        swUnder: 12,
        swMid: 6,
        swMain: 6.5,
        shadowBlur: 5,
        swCentre: 3.5,
        swRing: 2.5,
      }
    : {
        underlay: 'rgba(53,180,211,0.28)',
        mid: 'rgba(0,206,206,0.45)',
        main: '#35B4D3',
        shadow: 'rgba(53,180,211,0.55)',
        centreFill: '#0c0c12',
        centreStroke: '#5ec8e8',
        ring: '#7dd3f0',
        ringOpacity: 0.62,
        swUnder: 11,
        swMid: 5.5,
        swMain: 6.5,
        shadowBlur: 6,
        swCentre: 3.8,
        swRing: 3.5,
      }

  const minorColor = isLight ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.32)'
  const majorColor = isLight ? 'rgba(0,0,0,0.58)' : 'rgba(255,255,255,0.58)'
  const minorStrokeW = 1
  const majorStrokeW = isLight ? 1.45 : 1.55

  // ── Pan state ──────────────────────────────────────────────────────────────
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const spaceDown = useRef(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const panPointerStart = useRef<{ x: number; y: number } | null>(null)
  const suppressNextClickRef = useRef(false)
  const needsRecenterForProjectRef = useRef(true)
  const lastProjectIdRef = useRef<string | null>(null)
  const recenterSettledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Auto-pan while dragging a room near the canvas edge ────────────────────
  const isDraggingRoomRef = useRef(false)
  const autoPanRafRef = useRef<number | null>(null)
  const pointerScreenRef = useRef({ x: 0, y: 0 })

  /** Maps pointer proximity to a canvas edge into a pan speed (screen px/frame). */
  const AUTO_PAN_EDGE = 100  // px zone near each edge
  const AUTO_PAN_MAX  = 18   // max screen px per frame (~1080 px/sec at 60 fps)

  const runAutoPan = useCallback(() => {
    if (!isDraggingRoomRef.current) {
      autoPanRafRef.current = null
      return
    }
    const el = containerRef.current
    const stage = stageRef.current
    if (el && stage) {
      const rect = el.getBoundingClientRect()
      const { x: px, y: py } = pointerScreenRef.current

      /**
       * Quadratic ramp: 0 at edge-zone boundary → MAX at the very edge.
       * Sign convention: near LOW edge → positive delta (stage moves right/down,
       * revealing content that was off-screen to the left/top).
       * Near HIGH edge → negative delta (stage moves left/up, revealing right/bottom).
       */
      const edgeDelta = (pos: number, lo: number, hi: number): number => {
        const dLo = pos - lo
        const dHi = hi - pos
        if (dLo < AUTO_PAN_EDGE && dLo >= 0) {
          const f = 1 - dLo / AUTO_PAN_EDGE
          return AUTO_PAN_MAX * f * f   // near left/top  → pan right/down (+)
        }
        if (dHi < AUTO_PAN_EDGE && dHi >= 0) {
          const f = 1 - dHi / AUTO_PAN_EDGE
          return -AUTO_PAN_MAX * f * f  // near right/bottom → pan left/up  (-)
        }
        return 0
      }

      const panX = edgeDelta(px, rect.left, rect.right)
      const panY = edgeDelta(py, rect.top, rect.bottom)

      if (panX !== 0 || panY !== 0) {
        // Update Konva stage imperatively first — zero render-cycle lag.
        const newX = stage.x() + panX
        const newY = stage.y() + panY
        stage.x(newX)
        stage.y(newY)
        stage.batchDraw()
        // Keep store in sync so snap/commit logic sees the correct viewport.
        blueprintStore.getState().setViewport({ x: newX, y: newY })
      }
    }
    autoPanRafRef.current = requestAnimationFrame(runAutoPan)
  }, [])

  const handleChildDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if ((e.target as unknown) === stageRef.current) return
    isDraggingRoomRef.current = true
    if (autoPanRafRef.current === null) {
      autoPanRafRef.current = requestAnimationFrame(runAutoPan)
    }
  }, [runAutoPan])

  const handleChildDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if ((e.target as unknown) === stageRef.current) return
    isDraggingRoomRef.current = false
  }, [])

  const scheduleRecenterSettled = useCallback(() => {
    if (recenterSettledTimerRef.current) clearTimeout(recenterSettledTimerRef.current)
    recenterSettledTimerRef.current = setTimeout(() => {
      recenterSettledTimerRef.current = null
      needsRecenterForProjectRef.current = false
    }, RECENTER_AFTER_OPEN_MS)
  }, [])

  useLayoutEffect(() => {
    if (!projectId) {
      if (recenterSettledTimerRef.current) {
        clearTimeout(recenterSettledTimerRef.current)
        recenterSettledTimerRef.current = null
      }
      lastProjectIdRef.current = null
      return
    }
    if (lastProjectIdRef.current !== projectId) {
      if (recenterSettledTimerRef.current) {
        clearTimeout(recenterSettledTimerRef.current)
        recenterSettledTimerRef.current = null
      }
      lastProjectIdRef.current = projectId
      needsRecenterForProjectRef.current = true
    }
    const el = containerRef.current
    if (el && needsRecenterForProjectRef.current) {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) {
        setSize({ width: w, height: h })
        const store = blueprintStore.getState()
        store.setCanvasSize({ width: w, height: h })
        store.recenterViewportToOrigin()
        scheduleRecenterSettled()
      }
    }
  }, [projectId, scheduleRecenterSettled])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width <= 0 || height <= 0) return
      setSize({ width, height })
      const store = blueprintStore.getState()
      store.setCanvasSize({ width, height })
      if (needsRecenterForProjectRef.current) {
        store.recenterViewportToOrigin()
        scheduleRecenterSettled()
      }
    })
    obs.observe(el)
    return () => {
      obs.disconnect()
      if (recenterSettledTimerRef.current) {
        clearTimeout(recenterSettledTimerRef.current)
        recenterSettledTimerRef.current = null
      }
    }
  }, [scheduleRecenterSettled])

  // Track pointer position for auto-pan (passive — no re-renders)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointerScreenRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (autoPanRafRef.current !== null) {
        cancelAnimationFrame(autoPanRafRef.current)
        autoPanRafRef.current = null
      }
    }
  }, [])

  // Space key for pan mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceDown.current) {
        spaceDown.current = true
        setSpaceHeld(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false
        setSpaceHeld(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    if (size.width <= 0 || size.height <= 0) return
    const direction = e.evt.deltaY < 0 ? 1 : -1
    blueprintStore.getState().zoomViewportByPercentDelta(direction * 10)
  }, [size.width, size.height])

  const attachWindowPanListeners = useCallback(
    (startClientX: number, startClientY: number) => {
      isPanning.current = true
      setIsPanningUi(true)
      panStart.current = { x: startClientX, y: startClientY }

      const onMove = (ev: MouseEvent) => {
        if (!isPanning.current) return
        const dx = ev.clientX - panStart.current.x
        const dy = ev.clientY - panStart.current.y
        panStart.current = { x: ev.clientX, y: ev.clientY }
        const vp = blueprintStore.getState().viewport
        blueprintStore.getState().setViewport({ x: vp.x + dx, y: vp.y + dy })
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        isPanning.current = false
        setIsPanningUi(false)
        panPointerStart.current = null
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [],
  )

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const store = blueprintStore.getState()
      const tool = store.activeTool

      if (spaceDown.current || e.evt.button === 1) {
        attachWindowPanListeners(e.evt.clientX, e.evt.clientY)
        return
      }

      if (e.evt.button === 0 && e.target === stageRef.current) {
        store.clearSelection()

        if (tool !== 'draw' && tool !== 'measure') {
          attachWindowPanListeners(e.evt.clientX, e.evt.clientY)
          return
        }

        if (tool === 'draw') {
          panPointerStart.current = { x: e.evt.clientX, y: e.evt.clientY }
        }
      }
    },
    [attachWindowPanListeners],
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanning.current) return
      const start = panPointerStart.current
      if (!start || blueprintStore.getState().activeTool !== 'draw') return

      const dx = e.evt.clientX - start.x
      const dy = e.evt.clientY - start.y
      if (dx * dx + dy * dy < 36) return

      suppressNextClickRef.current = true
      panPointerStart.current = null
      attachWindowPanListeners(e.evt.clientX, e.evt.clientY)
    },
    [attachWindowPanListeners],
  )

  const handleMouseUp = useCallback(() => {
    if (!isPanning.current) panPointerStart.current = null
  }, [])

  // ── Stage click handler ────────────────────────────────────────────────────
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    if (isPanning.current) return
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    const store = blueprintStore.getState()
    const stage = stageRef.current!
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const scale = stage.scaleX()
    const worldPt: Point = {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale,
    }

    // Draw tool — place vertex
    if (store.activeTool === 'draw') {
      store.addDrawingVertex(snapPointToGrid(worldPt))
      return
    }

    // Measure tool — two clicks define a line; third resets
    if (store.activeTool === 'measure') {
      if (!measureStart) {
        setMeasureStart(worldPt)
        setMeasureLine(null)
      } else if (!measureLine) {
        setMeasureLine({ start: measureStart, end: worldPt })
        setMeasureStart(null)
      } else {
        setMeasureStart(null)
        setMeasureLine(null)
      }
      return
    }
  }, [measureStart, measureLine])

  const handleStageDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    const store = blueprintStore.getState()
    if (store.activeTool === 'draw') store.finishDrawing()
  }, [])

  const drawingVerts = useBlueprintStore(s => s.drawingVertices)

  const hasSize = size.width > 0 && size.height > 0

  // ── Measure label helpers ──────────────────────────────────────────────────
  const measureDistanceM = measureLine
    ? Math.sqrt(
        (measureLine.end.x - measureLine.start.x) ** 2 +
          (measureLine.end.y - measureLine.start.y) ** 2,
      ) * CM_TO_M
    : 0

  const measureMidX = measureLine ? (measureLine.start.x + measureLine.end.x) / 2 : 0
  const measureMidY = measureLine ? (measureLine.start.y + measureLine.end.y) / 2 : 0

  // ── Cursor ─────────────────────────────────────────────────────────────────
  const cursorStyle = isPanningUi
    ? 'grabbing'
    : spaceHeld
      ? 'grab'
      : activeTool === 'draw' || activeTool === 'measure'
        ? 'crosshair'
        : activeTool === 'select'
          ? 'default'
          : 'grab'

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-dark overflow-hidden"
      style={{ cursor: cursorStyle }}
    >
      {/* SVG grid — only visible when gridEnabled */}
      {hasSize && gridEnabled && (() => {
        const minorPx = MINOR_GRID * viewport.scale
        const majorPx = MAJOR_GRID * viewport.scale
        const patMinorX = ((viewport.x % minorPx) + minorPx) % minorPx
        const patMinorY = ((viewport.y % minorPx) + minorPx) % minorPx
        const patMajorX = ((viewport.x % majorPx) + majorPx) % majorPx
        const patMajorY = ((viewport.y % majorPx) + majorPx) % majorPx
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="bp-grid-minor"
                x={patMinorX}
                y={patMinorY}
                width={minorPx}
                height={minorPx}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${minorPx} 0 L 0 0 0 ${minorPx}`}
                  fill="none"
                  stroke={minorColor}
                  strokeWidth={minorStrokeW}
                />
              </pattern>
              <pattern
                id="bp-grid-major"
                x={patMajorX}
                y={patMajorY}
                width={majorPx}
                height={majorPx}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${majorPx} 0 L 0 0 0 ${majorPx}`}
                  fill="none"
                  stroke={majorColor}
                  strokeWidth={majorStrokeW}
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bp-grid-minor)" />
            <rect width="100%" height="100%" fill="url(#bp-grid-major)" />
          </svg>
        )
      })()}

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
          {/* Layer 0: World origin (0,0) — accent cross */}
          <Layer listening={false}>
            <Group>
              <Line
                points={[-ORIGIN_GLOW_OUTER, 0, ORIGIN_GLOW_OUTER, 0]}
                stroke={originCross.underlay}
                strokeWidth={originCross.swUnder}
                lineCap="round"
              />
              <Line
                points={[0, -ORIGIN_GLOW_OUTER, 0, ORIGIN_GLOW_OUTER]}
                stroke={originCross.underlay}
                strokeWidth={originCross.swUnder}
                lineCap="round"
              />
              <Line
                points={[-ORIGIN_GLOW_MID, 0, ORIGIN_GLOW_MID, 0]}
                stroke={originCross.mid}
                strokeWidth={originCross.swMid}
                lineCap="round"
              />
              <Line
                points={[0, -ORIGIN_GLOW_MID, 0, ORIGIN_GLOW_MID]}
                stroke={originCross.mid}
                strokeWidth={originCross.swMid}
                lineCap="round"
              />
              <Line
                points={[-ORIGIN_CROSS_HALF, 0, ORIGIN_CROSS_HALF, 0]}
                stroke={originCross.main}
                strokeWidth={originCross.swMain}
                lineCap="round"
                shadowBlur={originCross.shadowBlur}
                shadowColor={originCross.shadow}
                shadowOffsetX={0}
                shadowOffsetY={0}
              />
              <Line
                points={[0, -ORIGIN_CROSS_HALF, 0, ORIGIN_CROSS_HALF]}
                stroke={originCross.main}
                strokeWidth={originCross.swMain}
                lineCap="round"
                shadowBlur={originCross.shadowBlur}
                shadowColor={originCross.shadow}
                shadowOffsetX={0}
                shadowOffsetY={0}
              />
              <Circle
                x={0}
                y={0}
                radius={18}
                fill={originCross.centreFill}
                stroke={originCross.centreStroke}
                strokeWidth={originCross.swCentre}
                listening={false}
              />
              <Circle
                x={0}
                y={0}
                radius={52}
                stroke={originCross.ring}
                strokeWidth={originCross.swRing}
                opacity={originCross.ringOpacity}
                fillEnabled={false}
                listening={false}
              />
            </Group>
          </Layer>

          {/* Layer 1: Rooms and elements */}
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

          {/* Layer 2: Measure tool overlay */}
          <Layer listening={false}>
            {/* Start point indicator */}
            {measureStart && (
              <Circle
                x={measureStart.x}
                y={measureStart.y}
                radius={5}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={1.5}
              />
            )}

            {/* Measurement line + label */}
            {measureLine && (
              <Group>
                <Line
                  points={[
                    measureLine.start.x,
                    measureLine.start.y,
                    measureLine.end.x,
                    measureLine.end.y,
                  ]}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dash={[6 / viewport.scale, 4 / viewport.scale]}
                />
                <Circle
                  x={measureLine.start.x}
                  y={measureLine.start.y}
                  radius={4}
                  fill="#f59e0b"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                <Circle
                  x={measureLine.end.x}
                  y={measureLine.end.y}
                  radius={4}
                  fill="#f59e0b"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                {/* Distance label — unscaled so it stays readable at all zoom levels */}
                <Text
                  x={measureMidX}
                  y={measureMidY - 18 / viewport.scale}
                  text={`${measureDistanceM.toFixed(2)} m`}
                  fontSize={12 / viewport.scale}
                  fontStyle="bold"
                  fill="#f59e0b"
                  stroke="#0c0c12"
                  strokeWidth={3 / viewport.scale}
                  fillAfterStrokeEnabled
                  align="center"
                  offsetX={0}
                  listening={false}
                />
              </Group>
            )}
          </Layer>

          {/* Layer 3: UI overlays — snap guides */}
          <Layer listening={false}>
            <SnapGuides guides={snapGuides} />
          </Layer>
        </Stage>
      )}
    </div>
  )
}
