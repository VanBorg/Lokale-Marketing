export type SpecialRoomPlacementMode =
  | 'against-wall'
  | 'inside-room'
  | 'freestanding';

/**
 * Catalogue entry for one special room **type** (WC, badkamer, …).
 *
 * These files stay small on purpose: they only hold **defaults and labels** for the
 * sidebar and future heuristics. Rendering, dragging, snapping to walls, and
 * sub-room detection live in `canvas/` and `domain/`, not here.
 *
 * **Shape:** every special room is modelled as a **rectangle** on the plattegrond
 * (`shape: 'rechthoek'` when instantiated). It is not a fixed polygon template in
 * this folder — **length and width** are editable within `min*` / `max*` (and
 * height where relevant). `canRotate` allows turning the box on the canvas.
 */
export type SpecialRoomConfig = {
  type: string;
  label: string;
  icon: string;
  defaultLength: number;
  defaultWidth: number;
  defaultHeight: number;
  minLength: number;
  maxLength: number;
  minWidth: number;
  maxWidth: number;
  placementModes: SpecialRoomPlacementMode[];
  defaultPlacementMode: SpecialRoomPlacementMode;
  canRotate: boolean;
  canPlaceOnDiagonalWall: boolean;
  /**
   * Which **wall edge** (0–3) to prefer when several snap targets tie — see
   * `RECT_WALL_INDEX` in `wallIndexConvention.ts`. This is **not** a corner ID;
   * corners are where two wall indices meet. Currently reserved for future snapping logic.
   */
  preferredAttachmentWallIndex: number;
  description: string;
};
