// Vertices met de wand indices uitgeschreven:
// 0=top-horizontaal, 1=binnen-verticaal-rechts, 2=binnen-horizontaal,
// 3=buiten-verticaal-rechts, 4=onder-horizontaal, 5=links-verticaal
export const SNAP_WALL_INDICES = [0, 1, 3, 4, 5]; // muur 2 is de binnenhoek
export const INNER_WALL_INDICES = [2];
export const WALL_LABELS = ['Boven', 'Rechts-boven', 'Binnen-hoek', 'Rechts-onder', 'Onder', 'Links'];
export const VERTEX_COUNT = 6;
export const IS_ORTHOGONAL = true;
