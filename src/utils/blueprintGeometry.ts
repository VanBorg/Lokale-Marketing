export interface Point {
  x: number
  y: number
}

export const GRID_SIZE = 20
export const SNAP_THRESHOLD = 15
export const DEFAULT_WALL_HEIGHT = 250
export const PIXELS_PER_CM = 1

// ─── Wall helpers ────────────────────────────────────────────────────────────

export function wallLength(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function wallAngle(p1: Point, p2: Point): number {
  return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI
}

/** Inner angle at `current` vertex, between segments prev→current and current→next. */
export function innerAngle(prev: Point, current: Point, next: Point): number {
  const ax = prev.x - current.x
  const ay = prev.y - current.y
  const bx = next.x - current.x
  const by = next.y - current.y
  const dot = ax * bx + ay * by
  const cross = ax * by - ay * bx
  const angle = Math.abs((Math.atan2(Math.abs(cross), dot) * 180) / Math.PI)
  return Math.round(angle)
}

// ─── Area ────────────────────────────────────────────────────────────────────

/** Shoelace formula. Returns area in the same unit² as the vertices (px² = cm²). */
export function polygonArea(vertices: Point[]): number {
  const n = vertices.length
  if (n < 3) return 0
  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += vertices[i].x * vertices[j].y
    area -= vertices[j].x * vertices[i].y
  }
  return Math.abs(area) / 2
}

// ─── Point on segment ────────────────────────────────────────────────────────

export function pointOnSegment(t: number, a: Point, b: Point): Point {
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  }
}

export function nearestPointOnSegment(p: Point, a: Point, b: Point): { point: Point; t: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { point: a, t: 0 }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return { point: pointOnSegment(t, a, b), t }
}

// ─── Snapping ─────────────────────────────────────────────────────────────────

export function snapToGrid(val: number, gridSize: number = GRID_SIZE): number {
  return Math.round(val / gridSize) * gridSize
}

export function snapPointToGrid(p: Point, gridSize: number = GRID_SIZE): Point {
  return { x: snapToGrid(p.x, gridSize), y: snapToGrid(p.y, gridSize) }
}

interface SnapRoom {
  vertices: Point[]
}

/**
 * Find the nearest vertex of other rooms within `threshold` px (world units).
 * Returns the snapped point or null.
 */
export function findVertexSnap(
  dragPoint: Point,
  otherRooms: SnapRoom[],
  threshold: number = SNAP_THRESHOLD,
): Point | null {
  let best: Point | null = null
  let bestDist = threshold

  for (const room of otherRooms) {
    for (const v of room.vertices) {
      const dx = v.x - dragPoint.x
      const dy = v.y - dragPoint.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < bestDist) {
        bestDist = dist
        best = v
      }
    }
  }
  return best
}

/**
 * Find edge-to-edge collinear snap.
 * Returns an offset to apply to the dragged room's vertices, or null.
 */
export function findEdgeSnap(
  draggedVerts: Point[],
  otherRooms: SnapRoom[],
  threshold: number = SNAP_THRESHOLD,
): { offset: Point } | null {
  for (let i = 0; i < draggedVerts.length; i++) {
    const a = draggedVerts[i]
    const b = draggedVerts[(i + 1) % draggedVerts.length]
    const dragAngle = wallAngle(a, b)

    for (const room of otherRooms) {
      for (let j = 0; j < room.vertices.length; j++) {
        const c = room.vertices[j]
        const d = room.vertices[(j + 1) % room.vertices.length]
        const otherAngle = wallAngle(c, d)

        const angleDiff = Math.abs(((dragAngle - otherAngle + 540) % 360) - 180)
        if (angleDiff > 5 && angleDiff < 175) continue

        // Walls are parallel; check perpendicular distance
        const nx = -(d.y - c.y)
        const ny = d.x - c.x
        const len = Math.sqrt(nx * nx + ny * ny)
        if (len === 0) continue
        const ndx = nx / len
        const ndy = ny / len
        const perpDist = (a.x - c.x) * ndx + (a.y - c.y) * ndy

        if (Math.abs(perpDist) < threshold) {
          return { offset: { x: -perpDist * ndx, y: -perpDist * ndy } }
        }
      }
    }
  }
  return null
}

// ─── Display formatting ───────────────────────────────────────────────────────

export function formatLength(cm: number): string {
  if (cm >= 100) {
    return `${(cm / 100).toFixed(2).replace('.', ',')} m`
  }
  return `${Math.round(cm)} cm`
}

// ─── Preset shape vertex generators ──────────────────────────────────────────
// All shapes are centered on world origin (0,0) so they spawn at the canvas
// center cross when addRoom is called directly on "Volgende".

export function rectVertices(w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2
  return [
    { x: -hw, y: -hh },
    { x:  hw, y: -hh },
    { x:  hw, y:  hh },
    { x: -hw, y:  hh },
  ]
}

export function lShapeVertices(w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2
  return [
    { x: -hw, y: -hh },
    { x:   0, y: -hh },
    { x:   0, y:   0 },
    { x:  hw, y:   0 },
    { x:  hw, y:  hh },
    { x: -hw, y:  hh },
  ]
}

export function tShapeVertices(w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2
  const t = w / 6
  return [
    { x: -t,  y: -hh },
    { x:  t,  y: -hh },
    { x:  t,  y: -hh / 3 },
    { x:  hw, y: -hh / 3 },
    { x:  hw, y:  hh / 3 },
    { x:  t,  y:  hh / 3 },
    { x:  t,  y:  hh },
    { x: -t,  y:  hh },
    { x: -t,  y:  hh / 3 },
    { x: -hw, y:  hh / 3 },
    { x: -hw, y: -hh / 3 },
    { x: -t,  y: -hh / 3 },
  ]
}

export function uShapeVertices(w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2
  const t = w / 3
  return [
    { x: -hw,      y: -hh },
    { x: -hw + t,  y: -hh },
    { x: -hw + t,  y:   0 },
    { x:  hw - t,  y:   0 },
    { x:  hw - t,  y: -hh },
    { x:  hw,      y: -hh },
    { x:  hw,      y:  hh },
    { x: -hw,      y:  hh },
  ]
}

export function plusShapeVertices(w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2
  const tx = w / 6
  const ty = h / 6
  return [
    { x: -tx, y: -hh },
    { x:  tx, y: -hh },
    { x:  tx, y: -ty },
    { x:  hw, y: -ty },
    { x:  hw, y:  ty },
    { x:  tx, y:  ty },
    { x:  tx, y:  hh },
    { x: -tx, y:  hh },
    { x: -tx, y:  ty },
    { x: -hw, y:  ty },
    { x: -hw, y: -ty },
    { x: -tx, y: -ty },
  ]
}

export function trapeziumVertices(w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2
  const inset = w * 0.2
  return [
    { x: -(hw - inset), y: -hh },
    { x:   hw - inset,  y: -hh },
    { x:   hw,          y:  hh },
    { x: -hw,           y:  hh },
  ]
}

export function hexagonVertices(w: number, h: number): Point[] {
  const rx = w / 2
  const ry = h / 2
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    return { x: rx * Math.cos(angle), y: ry * Math.sin(angle) }
  })
}

export type ShapeType =
  | 'rechthoek'
  | 'l-vorm'
  | 't-vorm'
  | 'u-vorm'
  | 'plus-vorm'
  | 'trapezium'
  | 'zeshoek'
  | 'vrije-vorm'

export function generateShapeVertices(
  shape: ShapeType,
  width: number,
  height: number,
): Point[] {
  switch (shape) {
    case 'rechthoek': return rectVertices(width, height)
    case 'l-vorm': return lShapeVertices(width, height)
    case 't-vorm': return tShapeVertices(width, height)
    case 'u-vorm': return uShapeVertices(width, height)
    case 'plus-vorm': return plusShapeVertices(width, height)
    case 'trapezium': return trapeziumVertices(width, height)
    case 'zeshoek': return hexagonVertices(width, height)
    default: return rectVertices(width, height)
  }
}
