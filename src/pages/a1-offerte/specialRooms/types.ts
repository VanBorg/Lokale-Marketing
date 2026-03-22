export type SpecialRoomPlacementMode =
  | 'inside'
  | 'outside'
  | 'free';

/**
 * Role of each wall edge (index 0–3) in segment snapping.
 * attachment = the wall that snaps flush against a host room.
 * exterior   = outward-facing wall, never used as snap wall.
 * free       = may touch another room but does not have to.
 */
export type WallRole = 'attachment' | 'exterior' | 'free';

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
   * Which **wall edge** (0–3) to prefer when snapping — wall that attaches
   * flush to the host room. See `RECT_WALL_INDEX` in `wallIndexConvention.ts`.
   */
  preferredAttachmentWallIndex: number;
  description: string;
  /** Role of each of the 4 rectangular wall edges for segment snapping. */
  wallRoles: [WallRole, WallRole, WallRole, WallRole];
  /** The two vertex indices that form the attachment wall edge. */
  cornerSnapVertices: [number, number];
};
