import { PIXEL_MINOR_GRID_CM } from './pixelCanvasConstants'

/** World-space grid size in cm — same as `PIXEL_MINOR_GRID_CM` / `BLUEPRINT_MINOR_GRID_CM` (2 m). */
export const GRID_SIZE = PIXEL_MINOR_GRID_CM

/**
 * Snap a single world-space value to the nearest grid increment.
 * Pass `enabled = false` to get the original value unchanged.
 */
export function snapValue(v: number, enabled: boolean): number {
  return enabled ? Math.round(v / GRID_SIZE) * GRID_SIZE : v
}

/**
 * Snap both axes of a world-space point.
 */
export function snapPoint(
  x: number,
  y: number,
  enabled: boolean,
): { x: number; y: number } {
  return { x: snapValue(x, enabled), y: snapValue(y, enabled) }
}
