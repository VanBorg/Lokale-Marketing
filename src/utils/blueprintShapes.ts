import type { Point } from './blueprintGeometry'

// ─── Shape types ──────────────────────────────────────────────────────────────

export type ShapeType =
  | 'rechthoek'
  | 'l-vorm'
  | 't-vorm'
  | 'u-vorm'
  | 'i-vorm'
  | 'plus-vorm'

/** Opgeslagen shape; verwijderde presets vallen terug op rechthoek in generateShapeVertices */
export type RoomShapeStored = ShapeType | 'z-vorm' | 'z-omgekeerd' | 'l-omgekeerd'

// ─── Preset shape vertex generators ──────────────────────────────────────────
// All shapes are centred on world origin (0,0).

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

/** I-vorm: I-balk met brede horizontale flensen boven en onder, smal middenstuk */
export function iVormVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2
  const hs = w * 0.28
  const barH = d * 0.26
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

/** Plus-vorm: 12-punt kruis */
export function plusVormVertices(w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2
  const tx = w * 0.24
  const ty = h * 0.24
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

/** Genereert hoekpunten voor een preset-vorm. Onbekende/verwijderde vormen vallen terug op rechthoek. */
export function generateShapeVertices(
  shape: RoomShapeStored,
  width: number,
  height: number,
): Point[] {
  switch (shape) {
    case 'rechthoek':   return rectVertices(width, height)
    case 'l-vorm':      return lVormVertices(width, height)
    case 't-vorm':      return tVormVertices(width, height)
    case 'u-vorm':      return uVormVertices(width, height)
    case 'i-vorm':      return iVormVertices(width, height)
    case 'plus-vorm':   return plusVormVertices(width, height)
    default:            return rectVertices(width, height)
  }
}
