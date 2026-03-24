import { memo, useState, useEffect, useRef } from 'react'
import { Stage, Layer, Line, Circle, Text } from 'react-konva'
import type Konva from 'konva'
import type { Point } from '../../utils/blueprintGeometry'
import type { Room } from '../../store/blueprintStore'
import { wallLength, wallAngle, innerAngle, formatLength, applyWallLength } from '../../utils/blueprintGeometry'

interface RoomPreviewCanvasProps {
  vertices: Point[]
  onChange?: (vertices: Point[]) => void
  onDimensionChange?: (width: number, depth: number) => void
  width?: number
  height?: number
  room?: Room | null
  onToggleWallLock?: (wallIndex: number) => void
}

const PADDING = 20
const ACCENT = '#35B4D3'
const LOCKED_COLOUR = '#f59e0b'

const RoomPreviewCanvas = memo(function RoomPreviewCanvas({
  vertices,
  onChange,
  onDimensionChange,
  width = 280,
  height = 200,
  room,
  onToggleWallLock,
}: RoomPreviewCanvasProps) {
  const [localVerts, setLocalVerts] = useState<Point[]>(vertices)
  const [selectedWall, setSelectedWall] = useState<number | null>(null)
  const [editingLength, setEditingLength] = useState<string>('')

  const stageRef = useRef<Konva.Stage>(null)

  // These refs let drag callbacks always see current values without stale closures
  const scaleRef       = useRef(1)
  const localVertsRef  = useRef(localVerts)

  useEffect(() => {
    setLocalVerts(vertices)
    setSelectedWall(null)
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
    (width  - PADDING * 2) / roomW,
    (height - PADDING * 2) / roomH,
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

  // ── Corner drag — free angle / skew ─────────────────────────────────────

  const startCornerDrag = (e: Konva.KonvaEventObject<MouseEvent>, cornerIdx: number) => {
    e.evt.preventDefault()
    e.evt.stopPropagation()

    const origVerts = localVertsRef.current.map(v => ({ ...v }))
    const startClientX = e.evt.clientX
    const startClientY = e.evt.clientY

    const onMove = (me: MouseEvent) => {
      const deltaWorldX = (me.clientX - startClientX) / scaleRef.current
      const deltaWorldY = (me.clientY - startClientY) / scaleRef.current
      const newVerts = origVerts.map((v, i) =>
        i === cornerIdx ? { x: v.x + deltaWorldX, y: v.y + deltaWorldY } : { ...v }
      )
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

    const vA = localVerts[wallIdx]
    const vB = localVerts[(wallIdx + 1) % n]
    const isHorizontal = Math.abs(vA.y - vB.y) < 1
    const wallCoord = isHorizontal ? vA.y : vA.x

    const origVerts = localVertsRef.current.map(v => ({ ...v }))
    const startClientX = e.evt.clientX
    const startClientY = e.evt.clientY

    const onMove = (me: MouseEvent) => {
      let newVerts: Point[]
      if (isHorizontal) {
        const deltaWorldY = (me.clientY - startClientY) / scaleRef.current
        newVerts = origVerts.map(v =>
          Math.abs(v.y - wallCoord) < 1 ? { ...v, y: v.y + deltaWorldY } : { ...v }
        )
      } else {
        const deltaWorldX = (me.clientX - startClientX) / scaleRef.current
        newVerts = origVerts.map(v =>
          Math.abs(v.x - wallCoord) < 1 ? { ...v, x: v.x + deltaWorldX } : { ...v }
        )
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
    setSelectedWall(isAlreadySelected ? null : i)
    if (!isAlreadySelected) {
      const a = localVerts[i]
      const b = localVerts[(i + 1) % n]
      setEditingLength(String(Math.round(wallLength(a, b))))
    }
  }

  const handleLengthBlur = () => {
    if (selectedWall === null) return
    const len = parseFloat(editingLength)
    if (!isNaN(len) && len > 0) {
      const newVerts = applyWallLength(localVerts, selectedWall, len)
      setLocalVerts(newVerts)
      onChange?.(newVerts)
    }
  }

  const isWallLocked = (i: number) => room?.lockedWalls?.includes(i) ?? false

  return (
    <div className="rounded-lg border border-dark-border overflow-hidden bg-dark">
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

          {/* Clickable wall hit zones */}
          {screenVerts.map((sv, i) => {
            const next = screenVerts[(i + 1) % n]
            const locked   = isWallLocked(i)
            const selected = selectedWall === i
            return (
              <Line
                key={`wall-hit-${i}`}
                points={[sv.x, sv.y, next.x, next.y]}
                stroke={selected ? ACCENT : locked ? LOCKED_COLOUR : 'transparent'}
                strokeWidth={selected ? 3 : locked ? 2 : 1}
                hitStrokeWidth={14}
                onClick={() => handleWallClick(i)}
              />
            )
          })}

          {/* Wall-length labels */}
          {screenVerts.map((sv, i) => {
            const next = screenVerts[(i + 1) % n]
            const cx = (sv.x + next.x) / 2
            const cy = (sv.y + next.y) / 2
            const len = wallLength(localVerts[i], localVerts[(i + 1) % n])
            const angle = wallAngle(sv, next)
            const perp = angle - 90
            const ox = Math.cos((perp * Math.PI) / 180) * 13
            const oy = Math.sin((perp * Math.PI) / 180) * 13
            const label = formatLength(len)
            return (
              <Text
                key={`len-${i}`}
                x={cx + ox}
                y={cy + oy}
                text={label}
                fontSize={8}
                fill="rgba(255,255,255,0.55)"
                rotation={angle > 90 || angle < -90 ? angle + 180 : angle}
                align="center"
                offsetX={label.length * 2.8}
                offsetY={4.5}
                listening={false}
              />
            )
          })}

          {/* Inner-angle labels */}
          {screenVerts.map((sv, i) => {
            const prev = localVerts[(i - 1 + n) % n]
            const curr = localVerts[i]
            const next = localVerts[(i + 1) % n]
            const deg = innerAngle(prev, curr, next)
            return (
              <Text
                key={`ang-${i}`}
                x={sv.x + 6}
                y={sv.y - 14}
                text={`${deg}°`}
                fontSize={7}
                fill={ACCENT}
                listening={false}
              />
            )
          })}

          {/* Mid-wall handles — push/pull for width/depth resize */}
          {onChange && screenVerts.map((sv, i) => {
            const next = screenVerts[(i + 1) % n]
            return (
              <Circle
                key={`mid-${i}`}
                x={(sv.x + next.x) / 2}
                y={(sv.y + next.y) / 2}
                radius={4}
                fill="#0c0c12"
                stroke="#00cece"
                strokeWidth={1.5}
                onMouseDown={e => startWallDrag(e, i)}
              />
            )
          })}

          {/* Corner handles — free angle / skew */}
          {onChange && screenVerts.map((sv, i) => (
            <Circle
              key={`corner-${i}`}
              x={sv.x}
              y={sv.y}
              radius={6}
              fill="#0c0c12"
              stroke="#00cece"
              strokeWidth={2}
              onMouseDown={e => startCornerDrag(e, i)}
            />
          ))}
        </Layer>
      </Stage>

      {/* Wall control panel */}
      {selectedWall !== null && (
        <div className="p-2 border-t border-dark-border space-y-2 bg-dark">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-light/50 uppercase tracking-wider">
              Muur {selectedWall + 1}
            </span>
            <button
              onClick={() => setSelectedWall(null)}
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

          {onToggleWallLock && (
            <button
              onClick={() => onToggleWallLock(selectedWall)}
              className={[
                'w-full text-xs py-1.5 rounded-lg border transition-colors flex items-center justify-center gap-1.5',
                isWallLocked(selectedWall)
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-dark-border text-light/50 hover:text-light hover:border-accent/50',
              ].join(' ')}
            >
              {isWallLocked(selectedWall) ? '🔒 Vergrendeld' : '🔓 Vergrendelen'}
            </button>
          )}
        </div>
      )}
    </div>
  )
})

export default RoomPreviewCanvas
