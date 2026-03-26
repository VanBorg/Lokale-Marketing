import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react'
import type Konva from 'konva'
import { blueprintStore, useBlueprintStore } from '../../store/blueprintStore'
import {
  AUTO_PAN_EDGE,
  AUTO_PAN_MAX,
  RECENTER_AFTER_OPEN_MS,
} from './pixelCanvasConstants'

export function usePixelCanvasViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)

  const [size, setSize] = useState({ width: 0, height: 0 })

  const projectId = useBlueprintStore(s => s.projectId)

  const needsRecenterForProjectRef = useRef(true)
  const lastProjectIdRef = useRef<string | null>(null)
  const recenterSettledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDraggingRoomRef = useRef(false)
  const autoPanRafRef = useRef<number | null>(null)
  const pointerScreenRef = useRef({ x: 0, y: 0 })

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
          return AUTO_PAN_MAX * f * f
        }
        if (dHi < AUTO_PAN_EDGE && dHi >= 0) {
          const f = 1 - dHi / AUTO_PAN_EDGE
          return -AUTO_PAN_MAX * f * f
        }
        return 0
      }

      const panX = edgeDelta(px, rect.left, rect.right)
      const panY = edgeDelta(py, rect.top, rect.bottom)

      if (panX !== 0 || panY !== 0) {
        const newX = stage.x() + panX
        const newY = stage.y() + panY
        stage.x(newX)
        stage.y(newY)
        stage.batchDraw()
        blueprintStore.getState().setViewport({ x: newX, y: newY })
      }
    }
    autoPanRafRef.current = requestAnimationFrame(runAutoPan)
  }, [])

  const handleChildDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if ((e.target as unknown) === stageRef.current) return
      isDraggingRoomRef.current = true
      if (autoPanRafRef.current === null) {
        autoPanRafRef.current = requestAnimationFrame(runAutoPan)
      }
    },
    [runAutoPan],
  )

  const handleChildDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if ((e.target as unknown) === stageRef.current) return
      isDraggingRoomRef.current = false
    },
    [],
  )

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
      // Defer to next frame — avoids "ResizeObserver loop completed with undelivered notifications"
      // when our updates (setState, store) trigger layout in the same tick.
      requestAnimationFrame(() => {
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        if (width <= 0 || height <= 0) return
        setSize({ width, height })
        const store = blueprintStore.getState()
        store.setCanvasSize({ width, height })
        if (needsRecenterForProjectRef.current) {
          store.recenterViewportToOrigin()
          scheduleRecenterSettled()
        }
      })
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

  return {
    containerRef,
    stageRef,
    size,
    handleChildDragStart,
    handleChildDragEnd,
  }
}
