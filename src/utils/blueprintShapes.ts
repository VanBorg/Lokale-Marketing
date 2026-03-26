import type { Point } from './blueprintGeometry'

// ─── Gedeelde preset-verhoudingen ────────────────────────────────────────────
// Breedte-as: één beenfractie zodat U-opening, T-stam en plus-kern op elkaar blijven
// aansluiten (opening = w − 2×been, stambreedte = w − 2×been).
// Diepte-as: aparte legacy-fracties — niet gelijk trekken aan de beenfractie; anders worden
// T-dwarsstuk, L-inkeping en I-flensen visueel te vlak.

const ARM_THICKNESS_FRAC = 0.28

function armThicknessAlong(span: number): number {
  return span * ARM_THICKNESS_FRAC
}

/** Halve breedte/hoogte van het middenstuk (T-stam, plus-kern, I-smal midden). */
function centerHalfAlong(span: number): number {
  return span / 2 - armThicknessAlong(span)
}

/** Diepte van het dwarsstuk van de T (fractie van d). */
const T_CROSS_DEPTH_FRAC = 0.35
/** L: hoever de inkeping in y doorloopt (fractie van d). */
const L_INNER_LEG_DEPTH_FRAC = 0.45
const U_INNER_FLOOR_Y_FRAC = 0.3
/** I: hoogte van boven/onder horizontale flensen (fractie van d). */
const I_FLANGE_DEPTH_FRAC = 0.26

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
  const hw = w / 2, hd = d / 2, t = armThicknessAlong(w)
  return [
    { x: -hw,       y: -hd },
    { x:  hw,       y: -hd },
    { x:  hw,       y:  hd },
    { x: -hw + t,   y:  hd },
    { x: -hw + t,   y: -hd + d * L_INNER_LEG_DEPTH_FRAC },
    { x: -hw,       y: -hd + d * L_INNER_LEG_DEPTH_FRAC },
  ]
}

/** I-vorm: I-balk met brede horizontale flensen boven en onder, smal middenstuk */
export function iVormVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2
  const hs = centerHalfAlong(w)
  const barH = d * I_FLANGE_DEPTH_FRAC
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
  const hw = w / 2, hd = d / 2, t = armThicknessAlong(w)
  return [
    { x: -hw,      y: -hd },
    { x: -hw + t,  y: -hd },
    { x: -hw + t,  y:  hd * U_INNER_FLOOR_Y_FRAC },
    { x:  hw - t,  y:  hd * U_INNER_FLOOR_Y_FRAC },
    { x:  hw - t,  y: -hd },
    { x:  hw,      y: -hd },
    { x:  hw,      y:  hd },
    { x: -hw,      y:  hd },
  ]
}

/** T-vorm: 8-punt T */
export function tVormVertices(w: number, d: number): Point[] {
  const hw = w / 2, hd = d / 2
  const t = d * T_CROSS_DEPTH_FRAC
  const tx = centerHalfAlong(w)
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
  const tx = centerHalfAlong(w)
  const ty = centerHalfAlong(h)
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
