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
  constrainCornerDragPoint,
  mergeWallLockIndices,
  restoreLockedWallLengths,
  isVertexPinnedByGeometryWallLock,
} from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'

interface RoomPreviewCanvasProps {
  vertices: Point[]
  onChange?: (vertices: Point[]) => void
  onDimensionChange?: (width: number, depth: number) => void
  width?: number
  height?: number
  room?: Room | null
  onToggleWallLock?: (wallIndex: number) => void
  onToggleWallLengthLock?: (wallIndex: number) => void
  /** With `onSelectWall`, wall highlight is controlled by the parent (wall list ↔ canvas). */
  selectedWallIndex?: number | null
  onSelectWall?: (wallIndex: number | null) => void
  /** Hide the inline length/lock block under the stage when the parent shows a wall list. */
  hideWallDetailPanel?: boolean
  /** Wall index highlighted from the list (hover); thicker inner stroke on the map. */
  listHoverWallIndex?: number | null
  /** Canvas wall hover → parent can sync highlight on the wall list. */
  onHoverWall?: (wallIndex: number | null) => void
  /** Draft: muur-slot (geometrie). */
  draftGeometryLockedWalls?: number[]
  /** Draft: lengte-slot. */
  draftLengthLockedWalls?: number[]
  onDraftToggleGeometryLock?: (wallIndex: number) => void
  onDraftToggleLengthLock?: (wallIndex: number) => void
  /**
   * Marge rond de tekening (px). Hogere waarde = kamer visueel kleiner in hetzelfde stage, zonder vertices te wijzigen.
   */
  edgePaddingPx?: number
}

/** Standaard inset voor labels; Kamer Overview kan `edgePaddingPx` verhogen voor meer lucht. */
const DEFAULT_EDGE_PADDING = 48
const ACCENT = '#35B4D3'
/** Muur-slot (geometrie): oranje wandlijn op canvas. */
const ORANGE_WALL = '#f97316'
/** Lengte-slot: oranje meter-tekst (alleen bij expliciet lengte-slot). */
const ORANGE_LENGTH_LABEL = '#fb923c'

/** Leesbaar op donkere achtergrond; dunne outline i.p.v. dikke stroke. */
const MAP_LEN_FILL = '#e8eef4'
const MAP_LEN_STROKE = 'rgba(6, 8, 14, 0.42)'
const MAP_LEN_STROKE_SEL = 'rgba(6, 8, 14, 0.55)'
const MAP_LEN_FONT_SIZE = 12
/** Meters net buiten de wand (schermpx langs normaal), goed leesbaar i.p.v. op de lijn. */
const MAP_LEN_OUTWARD_PX = 16
const ANG_PILL_W = 30
const ANG_PILL_H = 15

const RoomPreviewCanvas = memo(function RoomPreviewCanvas({
  vertices,
  onChange,
  onDimensionChange,
  width = 280,
  height = 200,
  room,
  onToggleWallLock,
  onToggleWallLengthLock,
  selectedWallIndex: selectedWallIndexProp,
  onSelectWall,
  hideWallDetailPanel = false,
  listHoverWallIndex = null,
  onHoverWall,
  draftGeometryLockedWalls = [],
  draftLengthLockedWalls = [],
  onDraftToggleGeometryLock,
  onDraftToggleLengthLock,
  edgePaddingPx = DEFAULT_EDGE_PADDING,
}: RoomPreviewCanvasProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [localVerts, setLocalVerts] = useState<Point[]>(vertices)
  const [internalWall, setInternalWall] = useState<number | null>(null)
  const [editingLength, setEditingLength] = useState<string>('')

  const controlled = onSelectWall != null
  const selectedWall = controlled ? (selectedWallIndexProp ?? null) : internalWall

  const stageRef = useRef<Konva.Stage>(null)

  // These refs let drag callbacks always see current values without stale closures
  const scaleRef       = useRef(1)
  const localVertsRef  = useRef(localVerts)

  useEffect(() => {
    setLocalVerts(vertices)
  }, [vertices])

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

  const scale = Math.min(
    (width - edgePaddingPx * 2) / roomW,
    (height - edgePaddingPx * 2) / roomH,
    2,
  )

  const offsetX = (width  - roomW * scale) / 2 - minX * scale
  const offsetY = (height - roomH * scale) / 2 - minY * scale

  // Always-current values for drag callbacks
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

  /** Wandmidden, langs normaal naar buiten (binnen → buiten plattegrond) — voor meterlabels buiten de wand. */
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
    if (nx * toC.x + ny * toC.y < 0) {
      nx = -nx
      ny = -ny
    }
    return { x: mid.x - nx * distPx, y: mid.y - ny * distPx }
  }

  /** Corner i, offset toward interior (toward centroid). */
  const inwardFromCorner = (i: number, distPx: number) => {
    const sv = screenVerts[i]
    const vx = centroidScreen.x - sv.x
    const vy = centroidScreen.y - sv.y
    const vlen = Math.hypot(vx, vy) || 1
    return { x: sv.x + (vx / vlen) * distPx, y: sv.y + (vy / vlen) * distPx }
  }

  /** Segment parallel to wall i, offset toward polygon interior (screen px). */
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
    if (nx * toC.x + ny * toC.y < 0) {
      nx = -nx
      ny = -ny
    }
    return [
      sv.x + nx * insetPx,
      sv.y + ny * insetPx,
      next.x + nx * insetPx,
      next.y + ny * insetPx,
    ]
  }

  /** Shorten segment by `edgeTrim` fraction from each end (e.g. 0.13 → keep middle 74%). */
  const trimSegmentEnds = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    edgeTrim: number,
  ): [number, number, number, number] => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const t0 = edgeTrim
    const t1 = 1 - edgeTrim
    return [x1 + ux * len * t0, y1 + uy * len * t0, x1 + ux * len * t1, y1 + uy * len * t1]
  }

  const INNER_LINE_INSET_PX = 4
  /** List-hover line: leave 13% of wall length empty at each end. */
  const HOVER_LINE_EDGE_TRIM = 0.13

  // ── Corner drag — free angle / skew ─────────────────────────────────────

  const isGeometryLocked = (i: number) =>
    room ? (room.lockedWalls?.includes(i) ?? false) : draftGeometryLockedWalls.includes(i)

  const isLengthLockedOnly = (i: number) =>
    room ? (room.lengthLockedWalls?.includes(i) ?? false) : draftLengthLockedWalls.includes(i)

  /** Lengte mag niet wijzigen (invoer of geometrie). */
  const isLengthFixed = (i: number) => isGeometryLocked(i) || isLengthLockedOnly(i)

  const startCornerDrag = (e: Konva.KonvaEventObject<MouseEvent>, cornerIdx: number) => {
    e.evt.preventDefault()
    e.evt.stopPropagation()

    /** Muur-locatie-slot: hoek is vast als minstens één aansluitende wand geometrie-vergrendeld is. */
    const geoLocks = room ? (room.lockedWalls ?? []) : draftGeometryLockedWalls
    if (isVertexPinnedByGeometryWallLock(cornerIdx, n, geoLocks)) return

    const origVerts = localVertsRef.current.map(v => ({ ...v }))
    const lockedLens = new Array(n).fill(0)
    for (let i = 0; i < n; i++) {
      if (isLengthFixed(i)) {
        lockedLens[i] = wallLength(origVerts[i], origVerts[(i + 1) % n])
      }
    }
    const startClientX = e.evt.clientX
    const startClientY = e.evt.clientY

    const onMove = (me: MouseEvent) => {
      const deltaWorldX = (me.clientX - startClientX) / scaleRef.current
      const deltaWorldY = (me.clientY - startClientY) / scaleRef.current
      const naive = {
        x: origVerts[cornerIdx].x + deltaWorldX,
        y: origVerts[cornerIdx].y + deltaWorldY,
      }
      const pk = constrainCornerDragPoint(naive, cornerIdx, n, origVerts, isLengthFixed, lockedLens)
      const newVerts = origVerts.map((v, i) => (i === cornerIdx ? pk : { ...v }))
      setLocalVerts(newVerts)
      onChange?.(newVerts)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Mid-wall drag — push / pull to resize ────────────────────────────────

  const startWallDrag = (e: Konva.KonvaEventObject<MouseEvent>, wallIdx: number) => {
    e.evt.preventDefault()
    e.evt.stopPropagation()

    if (isLengthLockedOnly(wallIdx)) return

    const vA = localVerts[wallIdx]
    const vB = localVerts[(wallIdx + 1) % n]
    const isHorizontal = Math.abs(vA.y - vB.y) < 1
    const wallCoord = isHorizontal ? vA.y : vA.x

    const origVerts = localVertsRef.current.map(v => ({ ...v }))
    const geoLocks = room ? (room.lockedWalls ?? []) : draftGeometryLockedWalls
    const lockedLensLenOnly = new Array(n).fill(0)
    let anyLenOnly = false
    for (let i = 0; i < n; i++) {
      if (isLengthLockedOnly(i)) {
        anyLenOnly = true
        lockedLensLenOnly[i] = wallLength(origVerts[i], origVerts[(i + 1) % n])
      }
    }
    const startClientX = e.evt.clientX
    const startClientY = e.evt.clientY

    const onMove = (me: MouseEvent) => {
      let newVerts: Point[]
      if (isHorizontal) {
        const deltaWorldY = (me.clientY - startClientY) / scaleRef.current
        newVerts = origVerts.map((v, i) => {
          const onLine = Math.abs(v.y - wallCoord) < 1
          if (!onLine) return { ...v }
          if (isVertexPinnedByGeometryWallLock(i, n, geoLocks)) return { ...v }
          return { ...v, y: v.y + deltaWorldY }
        })
      } else {
        const deltaWorldX = (me.clientX - startClientX) / scaleRef.current
        newVerts = origVerts.map((v, i) => {
          const onLine = Math.abs(v.x - wallCoord) < 1
          if (!onLine) return { ...v }
          if (isVertexPinnedByGeometryWallLock(i, n, geoLocks)) return { ...v }
          return { ...v, x: v.x + deltaWorldX }
        })
      }
      if (anyLenOnly) {
        newVerts = restoreLockedWallLengths(newVerts, n, isLengthLockedOnly, lockedLensLenOnly)
      }
      for (let i = 0; i < n; i++) {
        if (isVertexPinnedByGeometryWallLock(i, n, geoLocks)) {
          newVerts[i] = { ...origVerts[i] }
        }
      }
      setLocalVerts(newVerts)
      onChange?.(newVerts)
    }

    const onUp = () => {
      // Snap final dimensions to 5 cm and notify parent
      const cur = localVertsRef.current
      const cxs = cur.map(v => v.x)
      const cys = cur.map(v => v.y)
      const newW = Math.max(50, Math.round((Math.max(...cxs) - Math.min(...cxs)) / 5) * 5)
      const newD = Math.max(50, Math.round((Math.max(...cys) - Math.min(...cys)) / 5) * 5)
      onDimensionChange?.(newW, newD)

      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Wall click — select for length edit ──────────────────────────────────

  const handleWallClick = (i: number) => {
    const isAlreadySelected = selectedWall === i
    const next = isAlreadySelected ? null : i
    if (controlled) {
      onSelectWall?.(next)
    } else {
      setInternalWall(next)
    }
    if (next !== null && !hideWallDetailPanel) {
      const a = localVerts[i]
      const b = localVerts[(i + 1) % n]
      setEditingLength(String(Math.round(wallLength(a, b))))
    }
  }

  const handleLengthBlur = () => {
    if (selectedWall === null || hideWallDetailPanel) return
    if (isLengthLockedOnly(selectedWall)) return
    const len = parseFloat(editingLength)
    if (!isNaN(len) && len > 0) {
      const locks = room
        ? mergeWallLockIndices(room.lockedWalls ?? [], room.lengthLockedWalls ?? [])
        : mergeWallLockIndices(draftGeometryLockedWalls, draftLengthLockedWalls)
      const newVerts = applyWallLengthRespectingLocks(localVerts, selectedWall, len, locks)
      setLocalVerts(newVerts)
      onChange?.(newVerts)
    }
  }

  const draftOrRoomToggleGeometry = (i: number) => {
    if (room && onToggleWallLock) onToggleWallLock(i)
    else onDraftToggleGeometryLock?.(i)
  }

  const draftOrRoomToggleLength = (i: number) => {
    if (room && onToggleWallLengthLock) onToggleWallLengthLock(i)
    else onDraftToggleLengthLock?.(i)
  }

  /** Konva heeft geen CSS-variabelen: aparte paletten voor light/dark. */
  const mapLenFillDefault = isLight ? '#0f172a' : MAP_LEN_FILL
  const mapLenStrokeDefault = isLight ? 'rgba(255,255,255,0.45)' : MAP_LEN_STROKE
  const mapLenStrokeSel = isLight ? 'rgba(15,23,42,0.5)' : MAP_LEN_STROKE_SEL
  const previewGeoLocks = room ? (room.lockedWalls ?? []) : draftGeometryLockedWalls
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

          {/* Clickable wall hit zones — outer stroke only for locked; selection = inner line below */}
          {screenVerts.map((sv, i) => {
            const next = screenVerts[(i + 1) % n]
            const geo = isGeometryLocked(i)
            const strokeCol = geo ? ORANGE_WALL : 'transparent'
            return (
              <Line
                key={`wall-hit-${i}`}
                points={[sv.x, sv.y, next.x, next.y]}
                stroke={strokeCol}
                strokeWidth={geo ? 2 : 1}
                hitStrokeWidth={14}
                onClick={() => handleWallClick(i)}
                onMouseEnter={() => onHoverWall?.(i)}
                onMouseLeave={() => onHoverWall?.(null)}
              />
            )
          })}

          {/* Inner wall highlight — same stroke for hover & select; list-hover line is shortened (13% margin each end) */}
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
                stroke={ACCENT}
                strokeWidth={1.5}
                opacity={0.95}
                lineCap="round"
                listening={false}
              />
            )
          })}

          {/* Mid-wall handles — push/pull (onder lengtelabels getekend, zie hieronder) */}
          {onChange && screenVerts.map((sv, i) => {
            const next = screenVerts[(i + 1) % n]
            const locked = isLengthLockedOnly(i)
            const strokeCol = isGeometryLocked(i) ? ORANGE_WALL : '#00cece'
            return (
              <Circle
                key={`mid-${i}`}
                x={(sv.x + next.x) / 2}
                y={(sv.y + next.y) / 2}
                radius={4}
                fill={locked ? '#1a1a22' : '#0c0c12'}
                stroke={locked ? strokeCol : '#00cece'}
                strokeWidth={1.5}
                onMouseDown={locked ? undefined : e => startWallDrag(e, i)}
              />
            )
          })}

          {/* Muurlengtes: buiten de wand (normaal), gecentreerd op dat punt */}
          {screenVerts.map((sv, i) => {
            const next = screenVerts[(i + 1) % n]
            const len = wallLength(localVerts[i], localVerts[(i + 1) % n])
            const angle = wallAngle(sv, next)
            const pos = outwardFromWallMid(i, MAP_LEN_OUTWARD_PX)
            const label = `${formatWallLengthMetersLabel(len)} m`
            const isWallSelected = selectedWall === i
            const isWallListHover = listHoverWallIndex === i
            const rot = angle > 90 || angle < -90 ? angle + 180 : angle
            const lenStroke = isWallSelected || isWallListHover ? mapLenStrokeSel : mapLenStrokeDefault
            const lenSw = isWallSelected || isWallListHover ? 0.85 : 0.65
            const labelW = Math.max(44, label.length * MAP_LEN_FONT_SIZE * 0.32)
            const labelH = MAP_LEN_FONT_SIZE * 1.25
            const lengthLabelOrange = room
              ? (room.lengthLockedWalls?.includes(i) ?? false)
              : draftLengthLockedWalls.includes(i)
            const labelFill = lengthLabelOrange
              ? ORANGE_LENGTH_LABEL
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
                  stroke={lengthLabelOrange ? ORANGE_LENGTH_LABEL : lenStroke}
                  strokeWidth={lengthLabelOrange ? 0.5 : lenSw}
                  lineJoin="round"
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            )
          })}

          {/* Hoekgraden: compacte pill i.p.v. losse tekst op de hoek */}
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

          {/* Corner handles — oranje = hoek vast door muur-geometrie-slot (eindpunt van oranje wand) */}
          {onChange && screenVerts.map((sv, i) => {
            const vertexPinned = isVertexPinnedByGeometryWallLock(i, n, previewGeoLocks)
            return (
              <Circle
                key={`corner-${i}`}
                x={sv.x}
                y={sv.y}
                radius={6}
                fill={vertexPinned ? '#1a1a22' : '#0c0c12'}
                stroke={vertexPinned ? ORANGE_WALL : '#00cece'}
                strokeWidth={2}
                onMouseDown={vertexPinned ? undefined : e => startCornerDrag(e, i)}
              />
            )
          })}
        </Layer>
      </Stage>
      </div>

      {/* Wall control panel — hidden when parent shows the unified wall list */}
      {selectedWall !== null && !hideWallDetailPanel && (
        <div className="p-2 border-t border-dark-border space-y-2 bg-dark">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-light/50 uppercase tracking-wider">
              Muur {selectedWall + 1}
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

          {(onToggleWallLock || onDraftToggleGeometryLock) && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => draftOrRoomToggleLength(selectedWall)}
                className={[
                  'text-[11px] py-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1',
                  isLengthLockedOnly(selectedWall)
                    ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                    : 'border-dark-border text-light/50 hover:border-orange-500/40 hover:text-orange-400/90',
                ].join(' ')}
              >
                {isLengthLockedOnly(selectedWall) ? '🔒' : '🔓'} Lengte
              </button>
              <button
                type="button"
                onClick={() => draftOrRoomToggleGeometry(selectedWall)}
                className={[
                  'text-[11px] py-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1',
                  isGeometryLocked(selectedWall)
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-dark-border text-light/50 hover:border-amber-500/45 hover:text-amber-400/90',
                ].join(' ')}
              >
                {isGeometryLocked(selectedWall) ? '🔒' : '🔓'} Muur
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default RoomPreviewCanvas
