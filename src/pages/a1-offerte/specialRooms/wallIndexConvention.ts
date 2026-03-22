/**
 * Special rooms with an axis-aligned rectangle footprint use the same **wall index**
 * convention as the rest of the plattegrond (`canvasSnapping`, `canvasTypes`):
 * segment `i` runs from vertex `i` → vertex `(i + 1) % 4`.
 *
 * This is about **edges (walls)**, not corner dots:
 * - **Wall indices** in code are **0–3** (four edges of the rectangle).
 * - If you prefer to think in **1–4**, use `humanWallNumberToIndex`: wall **1** = top edge … wall **4** = left edge (clockwise, starting at the top).
 *
 * Edges (same numbering as `rechthoek` / `WALL_LABELS` in the canvas):  
 * **0 = boven, 1 = rechts, 2 = onder, 3 = links.**
 *
 * Hoekpunten zijn de vier kruispunten van die randen; een “muurindex” is dus een **zijde**,
 * niet één hoek. Draaien (`rotation`) draait dit hele kader mee.
 */

/** 0-based wall segment index for a rectangle (see module docstring). */
export type RectWallIndex = 0 | 1 | 2 | 3;

export const RECT_WALL_INDEX = {
  TOP: 0,
  RIGHT: 1,
  BOTTOM: 2,
  LEFT: 3,
} as const satisfies Record<string, RectWallIndex>;

/** Same edges as human-friendly numbers 1 = top … 4 = left (clockwise). */
export function humanWallNumberToIndex(n: 1 | 2 | 3 | 4): RectWallIndex {
  return (n - 1) as RectWallIndex;
}

export function rectWallIndexToHumanNumber(i: RectWallIndex): 1 | 2 | 3 | 4 {
  return (i + 1) as 1 | 2 | 3 | 4;
}
