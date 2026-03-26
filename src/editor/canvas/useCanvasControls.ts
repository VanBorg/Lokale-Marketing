/** World-space grid size in cm — matches MINOR_GRID in PixelCanvas (2 m). */
export const GRID_SIZE = 200

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
