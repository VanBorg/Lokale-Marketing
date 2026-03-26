import { memo, useState, useEffect, useRef } from 'react'
import { Stage, Layer, Line, Circle, Text, Group, Rect } from 'react-konva'
import type Konva from 'konva'
import type { Point } from '../../utils/blueprintGeometry'
import type { Room } from '../../store/blueprintStore'
import {
  wallLength,
  wallAngle,
  innerAngle,
  formatWallLengthMetersLabel,
  applyWallLengthRespectingLocks,
  isVertexPinnedByGeometryWallLock,
  constrainCornerDragPoint,
} from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'

interface RoomPreviewCanvasProps {
  vertices: Point[]
  onChange?: (vertices: Point[]) => void
  onDimensionChange?: (width: number, depth: number) => void
  width?: number
  height?: number
  room?: Room | null
  /** Toggle the single wall lock for a placed room. */
  onToggleWallLock?: (wallIndex: number) => void
  /** Wall index highlighted from the parent (controlled selection). */
  selectedWallIndex?: number | null
  onSelectWall?: (wallIndex: number | null) => void
  /** Hide the inline length/lock block under the stage when the parent shows a wall list. */
  hideWallDetailPanel?: boolean
  /** Wall index highlighted from the list (hover). */
  listHoverWallIndex?: number | null
  /** Canvas wall hover → parent can sync highlight on the wall list. */
  onHoverWall?: (wallIndex: number | null) => void
  /** Draft: geometry-locked walls (no placed room selected). */
  draftLockedWalls?: number[]
  onDraftToggleLock?: (wallIndex: number) => void
  /**
   * Marge rond de tekening (px).
   */
  edgePaddingPx?: number
  planSpanWidthCm?: number
  planSpanDepthCm?: number
}

const DEFAULT_EDGE_PADDING = 48
const ACCENT = '#35B4D3'
/** Vergrendelde wand: oranje op canvas én in label. */
const ORANGE_LOCKED = '#f97316'
const ORANGE_LOCKED_LABEL = '#fb923c'

const MAP_LEN_FILL = '#e8eef4'
const MAP_LEN_STROKE = 'rgba(6, 8, 14, 0.42)'
const MAP_LEN_STROKE_SEL = 'rgba(6, 8, 14, 0.55)'
const MAP_LEN_FONT_SIZE = 12
const MAP_LEN_OUTWARD_PX = 16
const ANG_PILL_W = 30
const ANG_PILL_H = 15
const MID_WALL_HANDLE_RADIUS_PX = 5
const CORNER_HANDLE_RADIUS_PX = 8

const RoomPreviewCanvas = memo(function RoomPreviewCanvas({
  vertices,
  onChange,
  onDimensionChange,
  width = 280,
  height = 200,
  room,
  onToggleWallLock,
  selectedWallIndex: selectedWallIndexProp,
  onSelectWall,
  hideWallDetailPanel = false,
  listHoverWallIndex = null,
  onHoverWall,
  draftLockedWalls = [],
  onDraftToggleLock,
  edgePaddingPx = DEFAULT_EDGE_PADDING,
  planSpanWidthCm,
  planSpanDepthCm,
}: RoomPreviewCanvasProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [localVerts, setLocalVerts] = useState<Point[]>(vertices)
  const [internalWall, setInternalWall] = useState<number | null>(null)
  const [editingLength, setEditingLength] = useState<string>('')

  const controlled = onSelectWall != null
  const selectedWall = controlled ? (selectedWallIndexProp ?? null) : internalWall

  const stageRef = useRef<Konva.Stage>(null)
  const scaleRef       = useRef(1)
  const localVertsRef  = useRef(localVerts)
  const suppressVerticesFromPropsRef = useRef(false)
  /** Voorkomt dubbele store-commit als we net bij pointer-up al onChange hebben aangeroepen. */
  const suppressEndPointerSyncOnChangeRef = useRef(false)
  /** Laatste vertices uit pointer-move (state/ref kunnen bij mouseup nog niet gecommit zijn). */
  const lastDragVerticesRef = useRef<Point[] | null>(null)
  const verticesPropRef = useRef(vertices)
  verticesPropRef.current = vertices

  useEffect(() => {
    if (suppressVerticesFromPropsRef.current) return
    setLocalVerts(vertices)
  }, [vertices])

  const endPointerDragSync = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        suppressVerticesFromPropsRef.current = false
        const fromProps = verticesPropRef.current
        const loc = localVertsRef.current
        if (!loc || loc.length < 3) return
        if (!fromProps || fromProps.length !== loc.length) {
          setLocalVerts(loc.map(p => ({ ...p })))
          suppressEndPointerSyncOnChangeRef.current = false
          return
        }
        let d2 = 0
        for (let i = 0; i < loc.length; i++) {
          const dx = fromProps[i].x - loc[i].x
          const dy = fromProps[i].y - loc[i].y
          d2 += dx * dx + dy * dy
        }
        if (d2 < 1e-4) {
          setLocalVerts(fromProps.map(p => ({ ...p })))
        } else {
          const snap = loc.map(p => ({ ...p }))
          setLocalVerts(snap)
          if (!suppressEndPointerSyncOnChangeRef.current) {
            onChange?.(snap)
          }
        }
        suppressEndPointerSyncOnChangeRef.current = false
      })
    })
  }

  if (!vertices || vertices.length < 3) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dark-border bg-dark/60"
        style={{ width, height }}
      >
        <span className="text-xs text-light/30">Selecteer een vorm</span>
      </div>
    )
  }

  const xs = localVerts.map(v => v.x)
  const ys = localVerts.map(v => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const roomW = maxX - minX || 1
  const roomH = maxY - minY || 1

  const spanW = planSpanWidthCm ?? roomW
  const spanH = planSpanDepthCm ?? roomH

  const scale = Math.min(
    (width - edgePaddingPx * 2) / spanW,
    (height - edgePaddingPx * 2) / spanH,
    2,
  )

  const offsetX = (width - roomW * scale) / 2 - minX * scale
  const offsetY = (height - roomH * scale) / 2 - minY * scale

  scaleRef.current      = scale
  localVertsRef.current = localVerts

  const toScreen = (p: Point) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY })

  const screenVerts = localVerts.map(toScreen)
  const flatPoints  = screenVerts.flatMap(v => [v.x, v.y])
  const n = localVerts.length

  const centroidScreen = {
    x: screenVerts.reduce((s, v) => s + v.x, 0) / n,
    y: screenVerts.reduce((s, v) => s + v.y, 0) / n,
  }

  const outwardFromWallMid = (i: number, distPx: number) => {
    const sv = screenVerts[i]
    const next = screenVerts[(i + 1) % n]
    const mid = { x: (sv.x + next.x) / 2, y: (sv.y + next.y) / 2 }
    const dx = next.x - sv.x
    const dy = next.y - sv.y
    const elen = Math.hypot(dx, dy) || 1
    let nx = -dy / elen
    let ny = dx / elen
    const toC = { x: centroidScreen.x - mid.x, y: centroidScreen.y - mid.y }
    if (nx * toC.x + ny * toC.y < 0) { nx = -nx; ny = -ny }
    return { x: mid.x - nx * distPx, y: mid.y - ny * distPx }
  }

  const inwardFromCorner = (i: number, distPx: number) => {
    const sv = screenVerts[i]
    const vx = centroidScreen.x - sv.x
    const vy = centroidScreen.y - sv.y
    const vlen = Math.hypot(vx, vy) || 1
    return { x: sv.x + (vx / vlen) * distPx, y: sv.y + (vy / vlen) * distPx }
  }

  const innerWallPoints = (i: number, insetPx: number): [number, number, number, number] => {
    const sv = screenVerts[i]
    const next = screenVerts[(i + 1) % n]
    const cx = screenVerts.reduce((s, v) => s + v.x, 0) / n
    const cy = screenVerts.reduce((s, v) => s + v.y, 0) / n
    const mid = { x: (sv.x + next.x) / 2, y: (sv.y + next.y) / 2 }
    const dx = next.x - sv.x
    const dy = next.y - sv.y
    const len = Math.hypot(dx, dy) || 1
    let nx = -dy / len
    let ny = dx / len
    const toC = { x: cx - mid.x, y: cy - mid.y }
    if (nx * toC.x + ny * toC.y < 0) { nx = -nx; ny = -ny }
    return [sv.x + nx * insetPx, sv.y + ny * insetPx, next.x + nx * insetPx, next.y + ny * insetPx]
  }

  const trimSegmentEnds = (
    x1: number, y1: number, x2: number, y2: number, edgeTrim: number,
  ): [number, number, number, number] => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    return [x1 + ux * len * edgeTrim, y1 + uy * len * edgeTrim, x1 + ux * len * (1 - edgeTrim), y1 + uy * len * (1 - edgeTrim)]
  }

  const INNER_LINE_INSET_PX = 8
  const HOVER_LINE_EDGE_TRIM = 0.13

  /** The single lock: room's lockedWalls or draftLockedWalls. */
  const lockedWalls = room ? (room.lockedWalls ?? []) : draftLockedWalls
  const isWallLocked = (i: number) => lockedWalls.includes(i)
  const isVertexPinned = (i: number) => isVertexPinnedByGeometryWallLock(i, n, lockedWalls)

  // ── Corner drag ──────────────────────────────────────────────────────────────

  const startCornerDrag = (e: Konva.KonvaEventObject<MouseEvent>, cornerIdx: number) => {
    e.evt.preventDefault()
    e.evt.stopPropagation()

    suppressVerticesFromPropsRef.current = true
    const origVerts = localVertsRef.current.map(v => ({ ...v }))
    const startClientX = e.evt.clientX
    const startClientY = e.evt.clientY
    const dragScale = scaleRef.current

    /** Pre-compute locked wall lengths so constrainCornerDragPoint can hold them. */
    const lockedLens = origVerts.map((v, i) =>
      isWallLocked(i) ? wallLength(v, origVerts[(i + 1) % n]) : 0,
    )

    const onMove = (me: MouseEvent) => {
      const naive = {
        x: origVerts[cornerIdx].x + (me.clientX - startClientX) / dragScale,
        y: origVerts[cornerIdx].y + (me.clientY - startClientY) / dragScale,
      }
      /** Constrain so locked adjacent walls keep their length. */
      const constrained = constrainCornerDragPoint(
        naive,
        cornerIdx,
        n,
        origVerts,
        isWallLocked,
        lockedLens,
      )
      const newVerts = origVerts.map((v, i) => (i === cornerIdx ? constrained : { ...v }))
      lastDragVerticesRef.current = newVerts
      setLocalVerts(newVerts)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      suppressEndPointerSyncOnChangeRef.current = true
      const raw = lastDragVerticesRef.current
      lastDragVerticesRef.current = null
      const finalVerts = (raw ?? localVertsRef.current).map(p => ({ ...p }))
      onChange?.(finalVerts)
      endPointerDragSync()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Mid-wall drag ─────────────────────────────────────────────────────────────

  const startWallDrag = (e: Konva.KonvaEventObject<MouseEvent>, wallIdx: number) => {
    e.evt.preventDefault()
    e.evt.stopPropagation()

    if (isWallLocked(wallIdx)) return

    suppressVerticesFromPropsRef.current = true
    const vA = localVerts[wallIdx]
    const vB = localVerts[(wallIdx + 1) % n]
    const isHorizontal = Math.abs(vA.y - vB.y) < 1
    const isVertical = Math.abs(vA.x - vB.x) < 1
    const wallCoord = isHorizontal ? vA.y : vA.x

    const origVerts = localVertsRef.current.map(v => ({ ...v }))
    const eps = 1

    const vertexOnDraggedWallSegment = (i: number): boolean => {
      const v = origVerts[i]
      if (isHorizontal) {
        const xMin = Math.min(vA.x, vB.x)
        const xMax = Math.max(vA.x, vB.x)
        return Math.abs(v.y - wallCoord) < eps && v.x >= xMin - eps && v.x <= xMax + eps
      }
      if (isVertical) {
        const yMin = Math.min(vA.y, vB.y)
        const yMax = Math.max(vA.y, vB.y)
        return Math.abs(v.x - wallCoord) < eps && v.y >= yMin - eps && v.y <= yMax + eps
      }
      return i === wallIdx || i === (wallIdx + 1) % n
    }

    const startClientX = e.evt.clientX
    const startClientY = e.evt.clientY
    const dragScale = scaleRef.current

    const onMove = (me: MouseEvent) => {
      let newVerts: Point[]
      if (isHorizontal) {
        const deltaWorldY = (me.clientY - startClientY) / dragScale
        newVerts = origVerts.map((v, i) =>
          vertexOnDraggedWallSegment(i) ? { ...v, y: v.y + deltaWorldY } : { ...v },
        )
      } else if (isVertical) {
        const deltaWorldX = (me.clientX - startClientX) / dragScale
        newVerts = origVerts.map((v, i) =>
          vertexOnDraggedWallSegment(i) ? { ...v, x: v.x + deltaWorldX } : { ...v },
        )
      } else {
        const dx = vB.x - vA.x
        const dy = vB.y - vA.y
        const elen = Math.hypot(dx, dy) || 1
        const nx = -dy / elen
        const ny = dx / elen
        const mx = (me.clientX - startClientX) / dragScale
        const my = (me.clientY - startClientY) / dragScale
        const t = mx * nx + my * ny
        newVerts = origVerts.map((v, i) =>
          i === wallIdx || i === (wallIdx + 1) % n
            ? { x: v.x + nx * t, y: v.y + ny * t }
            : { ...v },
        )
      }
      /** Re-pin any geometry-locked vertices (safety net for collinear overlap). */
      for (let i = 0; i < n; i++) {
        if (isVertexPinned(i)) newVerts[i] = { ...origVerts[i] }
      }
      lastDragVerticesRef.current = newVerts
      setLocalVerts(newVerts)
    }

    const onUp = () => {
      const cur = lastDragVerticesRef.current ?? localVertsRef.current
      lastDragVerticesRef.current = null
      const cxs = cur.map(v => v.x)
      const cys = cur.map(v => v.y)
      const newW = Math.max(50, Math.round((Math.max(...cxs) - Math.min(...cxs)) / 5) * 5)
      const newD = Math.max(50, Math.round((Math.max(...cys) - Math.min(...cys)) / 5) * 5)
      suppressEndPointerSyncOnChangeRef.current = true
      onChange?.(cur.map(p => ({ ...p })))
      onDimensionChange?.(newW, newD)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      endPointerDragSync()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Wall click ────────────────────────────────────────────────────────────────

  const handleWallClick = (i: number) => {
    const next = selectedWall === i ? null : i
    if (controlled) onSelectWall?.(next)
    else setInternalWall(next)
    if (next !== null && !hideWallDetailPanel) {
      const a = localVerts[i]
      const b = localVerts[(i + 1) % n]
      setEditingLength(String(Math.round(wallLength(a, b))))
    }
  }

  const handleLengthBlur = () => {
    if (selectedWall === null || hideWallDetailPanel) return
    if (isWallLocked(selectedWall)) return
    const len = parseFloat(editingLength)
    if (!isNaN(len) && len > 0) {
      const newVerts = applyWallLengthRespectingLocks(localVerts, selectedWall, len, lockedWalls)
      setLocalVerts(newVerts)
      onChange?.(newVerts)
    }
  }

  const toggleLock = (i: number) => {
    if (room && onToggleWallLock) onToggleWallLock(i)
    else onDraftToggleLock?.(i)
  }

  /** Konva kleuren per thema. */
  const mapLenFillDefault = isLight ? '#0f172a' : MAP_LEN_FILL
  const mapLenStrokeDefault = isLight ? 'rgba(255,255,255,0.45)' : MAP_LEN_STROKE
  const mapLenStrokeSel = isLight ? 'rgba(15,23,42,0.5)' : MAP_LEN_STROKE_SEL
  const angPillFill = isLight ? 'rgba(53, 180, 211, 0.28)' : 'rgba(53, 180, 211, 0.12)'
  const angPillStroke = isLight ? 'rgba(15, 100, 120, 0.55)' : 'rgba(53, 180, 211, 0.42)'
  const angTextFill = isLight ? '#0c4a5c' : 'rgba(255, 255, 255, 0.9)'

  return (
    <div className="rounded-lg border border-dark-border overflow-hidden bg-dark">
      <div onMouseLeave={() => onHoverWall?.(null)}>
        <Stage ref={stageRef} width={width} height={height}>
          <Layer>
            {/* Room polygon fill + outline */}
            <Line
              points={flatPoints}
              closed
              fill="rgba(53,180,211,0.07)"
              stroke={ACCENT}
              strokeWidth={1.5}
              listening={false}
            />

            {/*
              Full-stage hit catcher below wall lines: clears canvas→list hover when the pointer
              is in the room interior (not on a wall strip). Per-wall onMouseLeave(null) caused
              null↔index thrashing every frame along edges and re-rendered the whole Kamerkaart.
            */}
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="transparent"
              listening
              onMouseEnter={() => onHoverWall?.(null)}
            />

            {/* Clickable wall hit zones — locked walls shown in orange (above the catcher) */}
            {screenVerts.map((sv, i) => {
              const next = screenVerts[(i + 1) % n]
              const locked = isWallLocked(i)
              return (
                <Line
                  key={`wall-hit-${i}`}
                  points={[sv.x, sv.y, next.x, next.y]}
                  stroke={locked ? ORANGE_LOCKED : 'transparent'}
                  strokeWidth={locked ? 2 : 1}
                  hitStrokeWidth={14}
                  onClick={() => handleWallClick(i)}
                  onMouseEnter={() => onHoverWall?.(i)}
                />
              )
            })}

            {/* Inner wall highlight for hover & selection */}
            {screenVerts.map((_, i) => {
              const isListHover = listHoverWallIndex === i
              const isSelected = selectedWall === i
              if (!isListHover && !isSelected) return null
              const [fx1, fy1, fx2, fy2] = innerWallPoints(i, INNER_LINE_INSET_PX)
              const [x1, y1, x2, y2] = isListHover
                ? trimSegmentEnds(fx1, fy1, fx2, fy2, HOVER_LINE_EDGE_TRIM)
                : [fx1, fy1, fx2, fy2]
              return (
                <Line
                  key={`inner-hl-${i}`}
                  points={[x1, y1, x2, y2]}
                  stroke={ORANGE_LOCKED}
                  strokeWidth={1.5}
                  opacity={0.95}
                  lineCap="round"
                  listening={false}
                />
              )
            })}

            {/* Mid-wall handles — only the locked wall's own handle is orange/disabled */}
            {onChange && screenVerts.map((sv, i) => {
              const next = screenVerts[(i + 1) % n]
              const locked = isWallLocked(i)
              return (
                <Circle
                  key={`mid-${i}`}
                  x={(sv.x + next.x) / 2}
                  y={(sv.y + next.y) / 2}
                  radius={MID_WALL_HANDLE_RADIUS_PX}
                  fill={locked ? '#1a1a22' : '#0c0c12'}
                  stroke={locked ? ORANGE_LOCKED : '#00cece'}
                  strokeWidth={1.5}
                  onMouseDown={locked ? undefined : e => startWallDrag(e, i)}
                />
              )
            })}

            {/* Length labels — orange when locked */}
            {screenVerts.map((sv, i) => {
              const next = screenVerts[(i + 1) % n]
              const len = wallLength(localVerts[i], localVerts[(i + 1) % n])
              const angle = wallAngle(sv, next)
              const pos = outwardFromWallMid(i, MAP_LEN_OUTWARD_PX)
              const label = formatWallLengthMetersLabel(len)
              const isWallSelected = selectedWall === i
              const isWallListHover = listHoverWallIndex === i
              const rot = angle > 90 || angle < -90 ? angle + 180 : angle
              const lenStroke = isWallSelected || isWallListHover ? mapLenStrokeSel : mapLenStrokeDefault
              const lenSw = isWallSelected || isWallListHover ? 0.85 : 0.65
              const labelW = Math.max(44, label.length * MAP_LEN_FONT_SIZE * 0.32)
              const labelH = MAP_LEN_FONT_SIZE * 1.25
              const locked = isWallLocked(i)
              const labelFill = locked
                ? ORANGE_LOCKED_LABEL
                : isWallSelected
                  ? ACCENT
                  : mapLenFillDefault
              return (
                <Group key={`len-${i}`} x={pos.x} y={pos.y} rotation={rot}>
                  <Text
                    x={0}
                    y={0}
                    offsetX={labelW / 2}
                    offsetY={labelH / 2}
                    width={labelW}
                    height={labelH}
                    text={label}
                    fontSize={MAP_LEN_FONT_SIZE}
                    fontStyle="normal"
                    fontFamily="system-ui, Segoe UI, sans-serif"
                    fill={labelFill}
                    stroke={locked ? ORANGE_LOCKED_LABEL : lenStroke}
                    strokeWidth={locked ? 0.5 : lenSw}
                    lineJoin="round"
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                  />
                </Group>
              )
            })}

            {/* Corner angle pills */}
            {screenVerts.map((sv, i) => {
              const prev = localVerts[(i - 1 + n) % n]
              const curr = localVerts[i]
              const next = localVerts[(i + 1) % n]
              const deg = innerAngle(prev, curr, next)
              const inset = 22
              const p = inwardFromCorner(i, inset)
              return (
                <Group key={`ang-${i}`} x={p.x} y={p.y} listening={false}>
                  <Rect
                    x={-ANG_PILL_W / 2}
                    y={-ANG_PILL_H / 2}
                    width={ANG_PILL_W}
                    height={ANG_PILL_H}
                    cornerRadius={6}
                    fill={angPillFill}
                    stroke={angPillStroke}
                    strokeWidth={1}
                  />
                  <Text
                    x={-ANG_PILL_W / 2}
                    y={-ANG_PILL_H / 2}
                    width={ANG_PILL_W}
                    height={ANG_PILL_H}
                    text={`${deg}°`}
                    fontSize={8}
                    fontStyle="bold"
                    fontFamily="system-ui, Segoe UI, sans-serif"
                    fill={angTextFill}
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                  />
                </Group>
              )
            })}

            {/* Corner handles — orange when the corner is an endpoint of a locked wall */}
            {onChange && screenVerts.map((sv, i) => {
              const atLockedWall = isWallLocked(i) || isWallLocked((i - 1 + n) % n)
              return (
                <Circle
                  key={`corner-${i}`}
                  x={sv.x}
                  y={sv.y}
                  radius={CORNER_HANDLE_RADIUS_PX}
                  fill={atLockedWall ? '#1a1a22' : '#0c0c12'}
                  stroke={atLockedWall ? ORANGE_LOCKED : '#00cece'}
                  strokeWidth={2}
                  onMouseDown={e => startCornerDrag(e, i)}
                />
              )
            })}
          </Layer>
        </Stage>
      </div>

      {/* Inline wall detail panel — hidden when parent shows the unified wall list */}
      {selectedWall !== null && !hideWallDetailPanel && (
        <div className="p-2 border-t border-dark-border space-y-2 bg-dark">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-light/50 uppercase tracking-wider">
              Wand {selectedWall + 1}
            </span>
            <button
              onClick={() => (controlled ? onSelectWall?.(null) : setInternalWall(null))}
              className="text-light/30 hover:text-light text-xs leading-none"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-light/50 w-14 shrink-0">Lengte</span>
            <input
              type="number"
              value={editingLength}
              onChange={e => setEditingLength(e.target.value)}
              onBlur={handleLengthBlur}
              onKeyDown={e => e.key === 'Enter' && handleLengthBlur()}
              className="ui-input text-xs py-1 w-20"
              min={10}
              max={5000}
            />
            <span className="text-xs text-light/40">cm</span>
          </div>

          {(onToggleWallLock || onDraftToggleLock) && (
            <button
              type="button"
              onClick={() => toggleLock(selectedWall)}
              className={[
                'w-full text-[11px] py-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5',
                isWallLocked(selectedWall)
                  ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                  : 'border-dark-border text-light/50 hover:border-orange-500/40 hover:text-orange-400/90',
              ].join(' ')}
            >
              {isWallLocked(selectedWall) ? '🔒' : '🔓'} Wand vergrendelen
            </button>
          )}
        </div>
      )}
    </div>
  )
})

export default RoomPreviewCanvas
