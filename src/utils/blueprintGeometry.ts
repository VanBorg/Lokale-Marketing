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

/** Perimeter of a polygon in the same unit as the vertices. */
export function getPerimeter(vertices: Point[]): number {
  return vertices.reduce((sum, v, i) => {
    const next = vertices[(i + 1) % vertices.length]
    return sum + wallLength(v, next)
  }, 0)
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

// ─── Wall length adjustment ────────────────────────────────────────────────────

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

// ─── Shape types ──────────────────────────────────────────────────────────────

export type ShapeType =
  | 'rechthoek'
  | 'l-vorm'
  | 'l-omgekeerd'
  | 't-vorm'
  | 'u-vorm'
  | 'i-vorm'
  | 'plus-vorm'
  | 'vrije-vorm'

// ─── Preset shape vertex generators ──────────────────────────────────────────
// All shapes are centered on world origin (0,0).

export function rectVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2
  return [
    { x: -hw, y: -hd },
    { x:  hw, y: -hd },
    { x:  hw, y:  hd },
    { x: -hw, y:  hd },
  ]
}

/** L-vorm: hoek rechtsboven, open links-onder */
export function lVormVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2, t = w * 0.35
  return [
    { x: -hw,       y: -hd },
    { x:  hw,       y: -hd },
    { x:  hw,       y:  hd },
    { x: -hw + t,   y:  hd },
    { x: -hw + t,   y: -hd + d * 0.45 },
    { x: -hw,       y: -hd + d * 0.45 },
  ]
}

/** L-omgekeerd: gespiegelde L horizontaal */
export function lOmgekeerdeVertices(w: number, d: number): Point[] {
  return lVormVertices(w, d).map(p => ({ x: -p.x, y: p.y }))
}

/** S-vorm: twee verspringende rechthoeken (8-punt, geen self-intersecting) */
export function sVormSimple(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2, overlap = d * 0.15
  return [
    { x: -hw, y: -hd },
    { x:   0, y: -hd },
    { x:   0, y: -overlap },
    { x:  hw, y: -overlap },
    { x:  hw, y:  hd },
    { x:   0, y:  hd },
    { x:   0, y:  overlap },
    { x: -hw, y:  overlap },
  ]
}

/** S-omgekeerd: gespiegelde S horizontaal */
export function sOmgekeerdeVertices(w: number, d: number): Point[] {
  return sVormSimple(w, d).map(p => ({ x: -p.x, y: p.y }))
}

/** Z-vorm: twee horizontale balken verbonden door een stap (8-punt) */
export function zVormVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2, step = w * 0.35
  return [
    { x: -hw,        y: -hd },
    { x:  hw - step, y: -hd },
    { x:  hw - step, y:   0 },
    { x:  hw,        y:   0 },
    { x:  hw,        y:  hd },
    { x: -hw + step, y:  hd },
    { x: -hw + step, y:   0 },
    { x: -hw,        y:   0 },
  ]
}

/** Z-omgekeerd: gespiegelde Z horizontaal */
export function zOmgekeerdeVertices(w: number, d: number): Point[] {
  return zVormVertices(w, d).map(p => ({ x: -p.x, y: p.y }))
}

/** I-vorm: I-balk met brede horizontale flensen boven en onder, smal middenstuk */
export function iVormVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2
  const hs = w * 0.22    // halve breedte van het verticale middenstuk
  const barH = d * 0.22  // hoogte van de horizontale flensen
  return [
    { x: -hw, y: -hd },
    { x:  hw, y: -hd },
    { x:  hw, y: -hd + barH },
    { x:  hs, y: -hd + barH },
    { x:  hs, y:  hd - barH },
    { x:  hw, y:  hd - barH },
    { x:  hw, y:  hd },
    { x: -hw, y:  hd },
    { x: -hw, y:  hd - barH },
    { x: -hs, y:  hd - barH },
    { x: -hs, y: -hd + barH },
    { x: -hw, y: -hd + barH },
  ]
}

/** U-vorm: 8-punt hoefijzer */
export function uVormVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2, t = w * 0.28
  return [
    { x: -hw,      y: -hd },
    { x: -hw + t,  y: -hd },
    { x: -hw + t,  y:  hd * 0.3 },
    { x:  hw - t,  y:  hd * 0.3 },
    { x:  hw - t,  y: -hd },
    { x:  hw,      y: -hd },
    { x:  hw,      y:  hd },
    { x: -hw,      y:  hd },
  ]
}

/** T-vorm: 8-punt T */
export function tVormVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2, t = d * 0.35, tx = w * 0.28
  return [
    { x: -hw, y: -hd },
    { x:  hw, y: -hd },
    { x:  hw, y: -hd + t },
    { x:  tx, y: -hd + t },
    { x:  tx, y:  hd },
    { x: -tx, y:  hd },
    { x: -tx, y: -hd + t },
    { x: -hw, y: -hd + t },
  ]
}

// Legacy generators kept for backwards compatibility
export function lShapeVertices(w: number, h: number): Point[] {
  return lVormVertices(w, h)
}

export function tShapeVertices(w: number, h: number): Point[] {
  return tVormVertices(w, h)
}

export function uShapeVertices(w: number, h: number): Point[] {
  return uVormVertices(w, h)
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

export function generateShapeVertices(
  shape: ShapeType,
  width: number,
  height: number,
): Point[] {
  switch (shape) {
    case 'rechthoek':   return rectVertices(width, height)
    case 'l-vorm':      return lVormVertices(width, height)
    case 'l-omgekeerd': return lOmgekeerdeVertices(width, height)
    case 't-vorm':      return tVormVertices(width, height)
    case 'u-vorm':      return uVormVertices(width, height)
    case 'i-vorm':      return iVormVertices(width, height)
    case 'plus-vorm':   return plusShapeVertices(width, height)
    default:            return rectVertices(width, height)
  }
}

// ─── Roof types ───────────────────────────────────────────────────────────────

export type RoofType =
  | 'plat'
  | 'schuin-enkel'
  | 'zadeldak'
  | 'schilddak'
  | 'mansardedak'
  | 'platband'

export interface RoofCalculation {
  type: RoofType
  wallHeight: number
  peakHeight: number
  pitch?: number
  floorAreaM2: number
  roofAreaM2: number
  totalVolumeM3: number
  gevelAreaM2: number
}

/**
 * Calculate roof area, volume and facade area based on roof type.
 * peakHeight = extra height above the wall top (cm).
 */
export function calculateRoof(
  vertices: Point[],
  wallHeight: number,
  roofType: RoofType,
  peakHeight: number,
  pitch?: number,
): RoofCalculation {
  const floorAreaM2 = polygonArea(vertices) / 10000
  const perimeter = getPerimeter(vertices) / 100

  let roofAreaM2 = floorAreaM2
  let totalVolumeM3 = floorAreaM2 * (wallHeight / 100)
  let gevelAreaM2 = perimeter * (wallHeight / 100)

  switch (roofType) {
    case 'plat':
    case 'platband':
      roofAreaM2 = floorAreaM2
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100)
      break

    case 'schuin-enkel': {
      const breedte = Math.sqrt(floorAreaM2)
      const hellingsLen = Math.sqrt(breedte * breedte + (peakHeight / 100) * (peakHeight / 100))
      const ratio = hellingsLen / (breedte || 1)
      roofAreaM2 = floorAreaM2 * ratio
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100) + (floorAreaM2 * (peakHeight / 100)) / 2
      break
    }

    case 'zadeldak': {
      const breedte = Math.sqrt(floorAreaM2)
      const halfBreedte = breedte / 2
      const hellingsLen = Math.sqrt(halfBreedte * halfBreedte + (peakHeight / 100) * (peakHeight / 100))
      const ratio = hellingsLen / (halfBreedte || 1)
      roofAreaM2 = floorAreaM2 * ratio
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100) + (floorAreaM2 * (peakHeight / 100)) / 2
      const triangleArea = (breedte * (peakHeight / 100)) / 2
      gevelAreaM2 += triangleArea * 2
      break
    }

    case 'schilddak':
      roofAreaM2 = floorAreaM2 * 1.3
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100) + (floorAreaM2 * (peakHeight / 100)) / 3
      break

    case 'mansardedak':
      roofAreaM2 = floorAreaM2 * 1.5
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100) + (floorAreaM2 * (peakHeight / 100)) * 0.6
      break
  }

  return {
    type: roofType,
    wallHeight,
    peakHeight: wallHeight + peakHeight,
    pitch,
    floorAreaM2:   Math.round(floorAreaM2   * 100) / 100,
    roofAreaM2:    Math.round(roofAreaM2    * 100) / 100,
    totalVolumeM3: Math.round(totalVolumeM3 * 100) / 100,
    gevelAreaM2:   Math.round(gevelAreaM2   * 100) / 100,
  }
}
