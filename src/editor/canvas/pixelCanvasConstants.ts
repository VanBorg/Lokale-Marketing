import type { Point } from '../../store/blueprintStore'
import { BLUEPRINT_MINOR_GRID_CM } from '../../store/blueprintStore'

/** One minor square = 2 m in world space (cm). */
export const PIXEL_MINOR_GRID_CM = BLUEPRINT_MINOR_GRID_CM

/** Major grid every 10 m (5 × minor). */
export const PIXEL_MAJOR_GRID_CM = BLUEPRINT_MINOR_GRID_CM * 5

/** Origin cross: 6 m total per axis; half = 1.5 × minor grid step (300 cm). */
export const ORIGIN_CROSS_HALF = PIXEL_MINOR_GRID_CM * 1.5

export const ORIGIN_GLOW_OUTER = Math.round(ORIGIN_CROSS_HALF * 1.1)
export const ORIGIN_GLOW_MID = Math.round(ORIGIN_CROSS_HALF * 1.05)

/** 1 px = 0.01 m (canvas world unit is cm). */
export const CM_TO_M = 0.01

/** After project open, ResizeObserver often fires many times as layout settles — recentre on each until quiet. */
export const RECENTER_AFTER_OPEN_MS = 150

/**
 * Min. distance between successive points while mouse held (cm, world). ~grid 20cm; too high (100) created a large dead zone for the 2nd point.
 */
export const STROKE_SAMPLE_MIN_CM = 28

/** Min. pointer movement (screen px) before sleep-selectie (marquee) start. */
export const MARQUEE_DRAG_THRESHOLD_PX = 4

/** Maps pointer proximity to a canvas edge into a pan speed (screen px/frame). */
export const AUTO_PAN_EDGE = 100

/** Max screen px per frame (~1080 px/sec at 60 fps). */
export const AUTO_PAN_MAX = 18

export interface MeasureLine {
  start: Point
  end: Point
}

/** Meetlint: duidelijk oranje op donkere en lichte kaart (los van merk-accent). */
export const MEASURE_STROKE = '#f97316'
export const MEASURE_FILL = '#f97316'
export const MEASURE_LABEL_BG = 'rgba(12, 12, 18, 0.82)'
