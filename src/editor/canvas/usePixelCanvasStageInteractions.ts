import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type RefObject,
} from 'react'
import type Konva from 'konva'
import {
  blueprintStore,
  useActiveTool,
  type Point,
} from '../../store/blueprintStore'
import { snapPointToGrid } from '../../utils/blueprintGeometry'
import { STROKE_SAMPLE_MIN_CM } from './pixelCanvasConstants'

interface UsePixelCanvasStageInteractionsArgs {
  stageRef: RefObject<Konva.Stage | null>
  size: { width: number; height: number }
}

export function usePixelCanvasStageInteractions({
  stageRef,
  size,
}: UsePixelCanvasStageInteractionsArgs) {
  const activeTool = useActiveTool()

  const [isPanningUi, setIsPanningUi] = useState(false)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const spaceDown = useRef(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const suppressNextClickRef = useRef(false)
  const drawStrokeCleanupRef = useRef<(() => void) | null>(null)

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

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      if (size.width <= 0 || size.height <= 0) return
      const direction = e.evt.deltaY < 0 ? 1 : -1
      blueprintStore.getState().zoomViewportByPercentDelta(direction * 10)
    },
    [size.width, size.height],
  )

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
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [],
  )

  const attachDrawStrokeListeners = useCallback((startWorld: Point) => {
    const clientToWorld = (cx: number, cy: number): Point | null => {
      const s = stageRef.current
      if (!s) return null
      const rect = s.container().getBoundingClientRect()
      const x = cx - rect.left
      const y = cy - rect.top
      const sc = s.scaleX()
      return { x: (x - s.x()) / sc, y: (y - s.y()) / sc }
    }

    const store = blueprintStore.getState()
    store.startDrawingStroke(startWorld)
    let lastSampleWorld = snapPointToGrid(startWorld)
    suppressNextClickRef.current = true

    const onMove = (ev: MouseEvent) => {
      if (!(ev.buttons & 1)) return
      const world = clientToWorld(ev.clientX, ev.clientY)
      if (!world) return
      const dist = Math.hypot(world.x - lastSampleWorld.x, world.y - lastSampleWorld.y)
      if (dist >= STROKE_SAMPLE_MIN_CM) {
        store.addDrawingVertex(world)
        lastSampleWorld = snapPointToGrid(world)
      }
    }

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('mouseup', onUp, true)
      drawStrokeCleanupRef.current = null

      const world = clientToWorld(ev.clientX, ev.clientY)
      if (world) {
        const dist = Math.hypot(world.x - lastSampleWorld.x, world.y - lastSampleWorld.y)
        if (dist > 2) store.addDrawingVertex(world)
      }
    }

    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('mouseup', onUp, true)

    drawStrokeCleanupRef.current = () => {
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('mouseup', onUp, true)
      drawStrokeCleanupRef.current = null
    }
  }, [stageRef])

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

        if (tool === 'measure') {
          return
        }

        if (tool !== 'draw' && tool !== 'write') {
          attachWindowPanListeners(e.evt.clientX, e.evt.clientY)
          return
        }

        if (tool === 'draw') {
          drawStrokeCleanupRef.current?.()
          const stage = stageRef.current
          if (!stage) return
          const pointer = stage.getPointerPosition()
          if (!pointer) return
          const scale = stage.scaleX()
          const worldPt: Point = {
            x: (pointer.x - stage.x()) / scale,
            y: (pointer.y - stage.y()) / scale,
          }
          attachDrawStrokeListeners(worldPt)
        }
      }
    },
    [attachWindowPanListeners, attachDrawStrokeListeners, stageRef],
  )

  useEffect(() => {
    return () => {
      drawStrokeCleanupRef.current?.()
    }
  }, [])

  const handleMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanning.current) return
      const store = blueprintStore.getState()
      if (store.activeTool !== 'measure' || !store.measureDraft) return
      const stage = stageRef.current
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      const scale = stage.scaleX()
      const worldPt: Point = {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale,
      }
      const hover = snapPointToGrid(worldPt)
      store.setMeasureDraft({
        start: store.measureDraft!.start,
        hover,
      })
    },
    [stageRef],
  )

  const handleMouseUp = useCallback(() => {}, [])

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
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

      if (store.activeTool === 'write') {
        store.addCanvasTextNote(worldPt)
        return
      }

      if (store.activeTool === 'measure') {
        const snap = snapPointToGrid(worldPt)
        const draft = store.measureDraft
        if (!draft) {
          store.setMeasureDraft({ start: snap, hover: snap })
          return
        }
        store.addMeasureLine(draft.start, snap)
        return
      }
    },
    [stageRef],
  )

  const handleStageDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== stageRef.current) return
      const store = blueprintStore.getState()
      if (store.activeTool === 'draw') store.finishDrawing()
    },
    [stageRef],
  )

  const cursorStyle = isPanningUi
    ? 'grabbing'
    : spaceHeld
      ? 'grab'
      : activeTool === 'draw' || activeTool === 'measure' || activeTool === 'write'
        ? 'crosshair'
        : activeTool === 'select'
          ? 'default'
          : 'grab'

  return {
    cursorStyle,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleStageClick,
    handleStageDblClick,
  }
}
