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

// ─── Area / perimeter ─────────────────────────────────────────────────────────

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

/** Perimeter of a polygon in the same unit as the vertices. */
export function getPerimeter(vertices: Point[]): number {
  return vertices.reduce((sum, v, i) => {
    const next = vertices[(i + 1) % vertices.length]
    return sum + wallLength(v, next)
  }, 0)
}

/** Axis-aligned bounds for marquee hit-testing (same units as vertices, e.g. cm). */
export interface AxisAlignedRect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function roomAxisAlignedBounds(vertices: Point[]): AxisAlignedRect | null {
  if (vertices.length < 1) return null
  const xs = vertices.map(v => v.x)
  const ys = vertices.map(v => v.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

export function rectsIntersect(a: AxisAlignedRect, b: AxisAlignedRect): boolean {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY)
}

export function axisAlignedRectFromCorners(a: Point, b: Point): AxisAlignedRect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  }
}

/** Axis-aligned bounding box size (same units as vertices, e.g. cm). Min 1 to avoid divide-by-zero. */
export function axisAlignedBBoxSize(vertices: Point[]): { w: number; h: number } {
  if (vertices.length < 1) return { w: 1, h: 1 }
  const xs = vertices.map(v => v.x)
  const ys = vertices.map(v => v.y)
  const w = Math.max(...xs) - Math.min(...xs)
  const h = Math.max(...ys) - Math.min(...ys)
  return { w: w || 1, h: h || 1 }
}

/** Middelpunt van de as-gealigneerde bbox van het grondplan (zelfde eenheid als hoekpunten). */
export function axisAlignedBBoxCentre(vertices: Point[]): Point | null {
  const b = roomAxisAlignedBounds(vertices)
  if (!b) return null
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
}

export function translatePolygon(vertices: Point[], dx: number, dy: number): Point[] {
  return vertices.map(v => ({ x: v.x + dx, y: v.y + dy }))
}

/**
 * Wereldcoördinaat (cm) onder het midden van het blueprint-stage, gegeven de Konva-viewport
 * zoals in `blueprintStore` (zelfde formule als zoomViewportByPercentDelta).
 */
export function worldPointAtBlueprintStageCentre(
  canvasWidth: number,
  canvasHeight: number,
  viewport: { x: number; y: number; scale: number },
): Point {
  const cx = canvasWidth / 2
  const cy = canvasHeight / 2
  const s = viewport.scale
  if (s === 0 || !Number.isFinite(s)) return { x: 0, y: 0 }
  return {
    x: (cx - viewport.x) / s,
    y: (cy - viewport.y) / s,
  }
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

// ─── Wall lock helpers ────────────────────────────────────────────────────────

/** Indices van wanden waarvan de lengte vast moet blijven (muur-slot + lengte-slot). */
export function mergeWallLockIndices(geometryLocked: number[], lengthLocked: number[]): number[] {
  return Array.from(new Set([...geometryLocked, ...lengthLocked])).sort((a, b) => a - b)
}

/**
 * Wand `k` verbindt hoek `k` met hoek `k+1`. Bij muur-geometrie-slot (lockedWalls) moeten die
 * hoekpunten in de wereld vaststaan: hoek `i` is eindpunt van wand `i-1` en start van wand `i`.
 */
export function isVertexPinnedByGeometryWallLock(
  vertexIndex: number,
  n: number,
  lockedWalls: readonly number[],
): boolean {
  if (n < 1 || lockedWalls.length === 0) return false
  const set = new Set(lockedWalls)
  return set.has((vertexIndex - 1 + n) % n) || set.has(vertexIndex)
}

// ─── Wall length constraint helpers ──────────────────────────────────────────

/**
 * Adjust the length of wall [wallIndex → wallIndex+1].
 * Moves vertex[wallIndex+1] along the wall direction to reach newLengthCm.
 */
export function applyWallLength(vertices: Point[], wallIndex: number, newLengthCm: number): Point[] {
  const n = vertices.length
  const a = vertices[wallIndex]
  const b = vertices[(wallIndex + 1) % n]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const currentLen = Math.sqrt(dx * dx + dy * dy)
  if (currentLen === 0) return vertices
  const ratio = newLengthCm / currentLen
  const newVerts = [...vertices]
  newVerts[(wallIndex + 1) % n] = {
    x: a.x + dx * ratio,
    y: a.y + dy * ratio,
  }
  return newVerts
}

/**
 * Zelfde als `applyWallLength`, maar kiest welk eindpunt van de wand verschuift zodat
 * vergrendelde buurmuren hun lengte behouden.
 */
export function applyWallLengthRespectingLocks(
  vertices: Point[],
  wallIndex: number,
  newLengthCm: number,
  lockedWallIndices: number[],
): Point[] {
  const n = vertices.length
  if (n < 2) return vertices

  const locked = new Set(lockedWallIndices.filter(i => i >= 0 && i < n && i !== wallIndex))
  if (locked.size === 0) {
    return applyWallLength(vertices, wallIndex, newLengthCm)
  }

  const k = wallIndex
  const a = vertices[k]
  const b = vertices[(k + 1) % n]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const curLen = Math.hypot(dx, dy)
  if (curLen < 1e-9) return vertices

  const ux = dx / curLen
  const uy = dy / curLen

  const cand1 = vertices.map(v => ({ ...v }))
  cand1[(k + 1) % n] = { x: a.x + ux * newLengthCm, y: a.y + uy * newLengthCm }

  const cand2 = vertices.map(v => ({ ...v }))
  cand2[k] = { x: b.x - ux * newLengthCm, y: b.y - uy * newLengthCm }

  const oldLens: number[] = []
  for (let i = 0; i < n; i++) {
    oldLens[i] = wallLength(vertices[i], vertices[(i + 1) % n])
  }

  const maxLockedErr = (verts: Point[]) => {
    let m = 0
    locked.forEach(i => {
      const cur = wallLength(verts[i], verts[(i + 1) % n])
      m = Math.max(m, Math.abs(cur - oldLens[i]))
    })
    return m
  }

  const wallPrev = (k - 1 + n) % n
  const wallNext = (k + 1) % n
  const lockPrev = locked.has(wallPrev)
  const lockNext = locked.has(wallNext)

  if (lockPrev && lockNext) {
    const e1 = maxLockedErr(cand1)
    const e2 = maxLockedErr(cand2)
    return e1 <= e2 ? cand1 : cand2
  }
  if (lockPrev) return cand1
  if (lockNext) return cand2
  return cand1
}

/** Closest point on circle (centre `c`, radius `r`) to point `p`. */
export function projectPointOntoCircle(p: Point, c: Point, r: number): Point {
  const dx = p.x - c.x
  const dy = p.y - c.y
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 1e-12) return { x: c.x + r, y: c.y }
  const s = r / d
  return { x: c.x + dx * s, y: c.y + dy * s }
}

/** Intersection of two circles (0–2 points). Empty if no real intersection. */
export function intersectTwoCircles(c0: Point, r0: number, c1: Point, r1: number): Point[] {
  const dx = c1.x - c0.x
  const dy = c1.y - c0.y
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 1e-10) return []
  if (d > r0 + r1 + 1e-4) return []
  if (d < Math.abs(r0 - r1) - 1e-4) return []
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d)
  const hSq = r0 * r0 - a * a
  if (hSq < -1e-6) return []
  const h = Math.sqrt(Math.max(0, hSq))
  const mx = c0.x + (dx * a) / d
  const my = c0.y + (dy * a) / d
  const rx = (-dy * h) / d
  const ry = (dx * h) / d
  return [
    { x: mx + rx, y: my + ry },
    { x: mx - rx, y: my - ry },
  ]
}

/**
 * Hoek `cornerIdx` slepen terwijl vergrendelde wanden hun lengte uit `lockedLengths` behouden.
 */
export function constrainCornerDragPoint(
  naive: Point,
  cornerIdx: number,
  n: number,
  fixedNeighborVerts: Point[],
  isWallLocked: (wallIndex: number) => boolean,
  lockedLengths: number[],
): Point {
  const k = cornerIdx
  const prevWall = (k - 1 + n) % n
  const wallK = k
  const vPrev = fixedNeighborVerts[(k - 1 + n) % n]
  const vNext = fixedNeighborVerts[(k + 1) % n]

  const lockPrev = isWallLocked(prevWall)
  const lockK = isWallLocked(wallK)

  if (!lockPrev && !lockK) return naive

  if (lockPrev && lockK) {
    const Lp = lockedLengths[prevWall]
    const Lk = lockedLengths[wallK]
    const pts = intersectTwoCircles(vPrev, Lp, vNext, Lk)
    if (pts.length >= 2) {
      const d0 = (naive.x - pts[0].x) ** 2 + (naive.y - pts[0].y) ** 2
      const d1 = (naive.x - pts[1].x) ** 2 + (naive.y - pts[1].y) ** 2
      return d0 <= d1 ? pts[0] : pts[1]
    }
    if (pts.length === 1) return pts[0]
    return projectPointOntoCircle(naive, vPrev, Lp)
  }

  if (lockPrev) {
    return projectPointOntoCircle(naive, vPrev, lockedLengths[prevWall])
  }
  return projectPointOntoCircle(naive, vNext, lockedLengths[wallK])
}


// ─── Snapping helpers ─────────────────────────────────────────────────────────

interface SnapRoom {
  vertices: Point[]
}

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
      if (dist < bestDist) { bestDist = dist; best = v }
    }
  }
  return best
}

/**
 * Corner-to-corner snap for whole-room drag.
 * Checks every vertex of the dragged room against every vertex of other rooms and returns
 * the smallest offset that snaps the closest pair of corners together.
 * Takes priority over wall-to-wall edge snap.
 */
export function findRoomCornerSnap(
  draggedVerts: Point[],
  otherRooms: SnapRoom[],
  threshold: number = 30,
): { offset: Point } | null {
  let bestDist = threshold
  let bestOffset: Point | null = null
  for (const myVert of draggedVerts) {
    for (const room of otherRooms) {
      for (const v of room.vertices) {
        const ddx = v.x - myVert.x
        const ddy = v.y - myVert.y
        const dist = Math.hypot(ddx, ddy)
        if (dist < bestDist) {
          bestDist = dist
          bestOffset = { x: ddx, y: ddy }
        }
      }
    }
  }
  return bestOffset ? { offset: bestOffset } : null
}

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

/** Decimaal met komma (NL), geen punt als decimaalteken. */
export function formatNlDecimal(n: number, fractionDigits: number): string {
  return n.toFixed(fractionDigits).replace('.', ',')
}

/** Weergave van centimeters als meters met NL-decimaal (bijv. "2,50 m"). */
export function formatCmAsMeters(cm: number, fractionDigits = 2): string {
  return `${formatNlDecimal(cm / 100, fractionDigits)} m`
}

/**
 * Parse invoer in meters ("2,50" of "2.5") naar centimeters (afgerond).
 * Returns null bij lege of ongeldige invoer.
 */
export function parseMetersInputToCm(raw: string): number | null {
  const t = raw.trim().replace(',', '.')
  if (t === '') return null
  const m = parseFloat(t)
  if (Number.isNaN(m) || m < 0) return null
  return Math.round(m * 100)
}

/** Waarde voor `type="number"` velden in meters; data blijft cm. */
export function cmToMeterFieldValue(cm: number): number {
  return Math.round(cm) / 100
}

/** Van meter-veld terug naar cm, begrensd. */
export function clampCmFromMetersField(m: number, minCm: number, maxCm: number): number {
  if (Number.isNaN(m)) return minCm
  return Math.max(minCm, Math.min(maxCm, Math.round(m * 100)))
}

export function formatLength(cm: number): string {
  return formatCmAsMeters(cm, 2)
}

/** Plattegrond: lengte in meters, twee decimalen (bijv. "4,00"). */
export function formatWallLengthMetersLabel(cm: number): string {
  return formatNlDecimal(cm / 100, 2)
}

// ─── Re-exports from sub-modules ─────────────────────────────────────────────
// Existing imports from this file continue to work unchanged.

export type { ShapeType, RoomShapeStored } from './blueprintShapes'
export {
  rectVertices,
  lVormVertices,
  iVormVertices,
  uVormVertices,
  tVormVertices,
  plusVormVertices,
  generateShapeVertices,
} from './blueprintShapes'

export type { RoofType, RoofCalculation } from './blueprintRoof'
export { calculateRoof } from './blueprintRoof'
