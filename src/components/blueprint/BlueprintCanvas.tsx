import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { Stage, Layer, Circle, Line, Group } from 'react-konva'
import type Konva from 'konva'
import {
  blueprintStore,
  useBlueprintStore,
  useRoomIds,
  useActiveTool,
  useViewport,
  useSnapGuides,
} from '../../store/blueprintStore'
import { snapPointToGrid } from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'
import EditableRoom from './EditableRoom'
import SnapGuides from './SnapGuides'

const MINOR_GRID = 200   // 2 m in world units (cm)
const MAJOR_GRID = 1000  // 10 m in world units (cm)
/** Origin cross: 6 m total per axis (2× previous); half = 1.5 × minor grid step (300 cm) */
const ORIGIN_CROSS_HALF = MINOR_GRID * 1.5 // 300 cm
const ORIGIN_GLOW_OUTER = Math.round(ORIGIN_CROSS_HALF * 1.1)
const ORIGIN_GLOW_MID = Math.round(ORIGIN_CROSS_HALF * 1.05)

/** After project open, RO often fires many times as layout settles — recentre on each until quiet, then clear flag. */
const RECENTER_AFTER_OPEN_MS = 150

export default function BlueprintCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)

  // Start at 0×0 — Stage is not rendered until ResizeObserver gives us real dimensions
  const [size, setSize] = useState({ width: 0, height: 0 })
  /** Keeps cursor `grabbing` during pan (viewport updates would otherwise reset inline style) */
  const [isPanningUi, setIsPanningUi] = useState(false)

  const roomIds = useRoomIds()
  const projectId = useBlueprintStore(s => s.projectId)
  const activeTool = useActiveTool()
  const viewport = useViewport()
  const snapGuides = useSnapGuides()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // Origin cross: light backgrounds need darker cyan/teal; slightly wider strokes for visibility
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

  // Grid: use ThemeContext (not classList) so toggling theme updates the SVG immediately.
  // Both modes: strong enough contrast on bg-dark / light surfaces.
  const minorColor = isLight ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.32)'
  const majorColor = isLight ? 'rgba(0,0,0,0.58)' : 'rgba(255,255,255,0.58)'
  const minorStrokeW = 1
  const majorStrokeW = isLight ? 1.45 : 1.55

  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const spaceDown = useRef(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  /** Draw-tool: left-drag only pans after moving past this distance (px) */
  const panPointerStart = useRef<{ x: number; y: number } | null>(null)
  const suppressNextClickRef = useRef(false)
  /** True while opening a project: keep recentring on each size tick until layout settles (same as S). */
  const needsRecenterForProjectRef = useRef(true)
  const lastProjectIdRef = useRef<string | null>(null)
  const recenterSettledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRecenterSettled = useCallback(() => {
    if (recenterSettledTimerRef.current) clearTimeout(recenterSettledTimerRef.current)
    recenterSettledTimerRef.current = setTimeout(() => {
      recenterSettledTimerRef.current = null
      needsRecenterForProjectRef.current = false
    }, RECENTER_AFTER_OPEN_MS)
  }, [])

  // When projectId changes, RO may not fire (same size), so sync measure + recenter (same as S).
  // Do not clear needsRecenter here: RO may fire repeatedly while the shell widens — we recentre on each
  // until RECENTER_AFTER_OPEN_MS after the last resize tick (see scheduleRecenterSettled).
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

  // Single ResizeObserver — only writer for size + canvasSize (contentRect).
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

  // Wheel zoom — zelfde 10%-stappen als toolbar / toetsenbord (centre-fixed via store)
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

        if (tool !== 'draw') {
          attachWindowPanListeners(e.evt.clientX, e.evt.clientY)
          return
        }

        panPointerStart.current = { x: e.evt.clientX, y: e.evt.clientY }
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

  // Click on stage background — place drawing vertex
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    if (isPanning.current) return
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }
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

  const drawingVerts = useBlueprintStore(s => s.drawingVertices)

  const hasSize = size.width > 0 && size.height > 0

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-dark overflow-hidden"
      style={{
        cursor: isPanningUi
          ? 'grabbing'
          : spaceHeld
            ? 'grab'
            : activeTool === 'draw'
              ? 'crosshair'
              : 'grab',
      }}
    >
      {/* SVG grid — fills 100% of container, zooms/pans with viewport */}
      {hasSize && (() => {
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
        >
          {/* Layer 0: World origin (0,0) — accent kruis (plattegrond) */}
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

          {/* Layer 3: UI overlays — snap guides only */}
          <Layer listening={false}>
            <SnapGuides guides={snapGuides} />
          </Layer>
        </Stage>
      )}
    </div>
  )
}
