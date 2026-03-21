import { SPECIAL_ROOM_CONFIGS } from '../specialRooms';
import type { RoomElement, RoomType, RoomWalls, WallsCustomized } from './roomTypes';

export function createDefaultWalls(h: number): RoomWalls {
  const side = { heightLeft: h, heightRight: h };
  return { top: { ...side }, right: { ...side }, bottom: { ...side }, left: { ...side } };
}

export function createDefaultWallsCustomized(): WallsCustomized {
  return { top: false, right: false, bottom: false, left: false };
}

export const ROOM_TYPE_ICONS: Record<RoomType, string> = {
  normal: '',
  wc: '🚽',
  badkamer: '🚿',
  kast: '🗄️',
  berging: '📦',
  doorgang: '🚪',
  logia: '🏛️',
  plateau: '⬆️',
  erker: '🪟',
  nis: '↩️',
  schouw: '🔥',
  trapgat: '🪜',
  balkon: '🌤️',
};

export const SPECIAL_ROOMS = Object.values(SPECIAL_ROOM_CONFIGS).map(c => ({
  type: c.type as RoomType,
  label: c.label,
  length: c.defaultLength,
  width: c.defaultWidth,
}));

export const SPECIAL_ROOM_TYPES = new Set<RoomType>(SPECIAL_ROOMS.map((room) => room.type));

export const SPECIAL_ROOM_SCHUIN_ROTATION_DEG = 45;

export const SHAPES = [
  { id: 'rechthoek', label: 'Rechthoek' },
  { id: 'l-vorm', label: 'L-vorm' },
  { id: 'boog', label: 'Omgekeerde L' },
  { id: 't-vorm', label: 'T-vorm' },
  { id: 'u-vorm', label: 'U-vorm' },
  { id: 'z-vorm', label: 'Z-vorm' },
  { id: 'z-vorm-inv', label: 'S-vorm (Z inv)' },
  { id: 'i-vorm', label: 'I-profiel' },
  { id: 'vrije-vorm', label: 'Vrij vorm' },
] as const;

export const SHAPE_DEFAULTS: Record<string, { length: number; width: number }> = {
  rechthoek: { length: 4, width: 3 },
  'l-vorm': { length: 4, width: 3 },
  'i-vorm': { length: 4, width: 3 },
  't-vorm': { length: 5, width: 4 },
  'u-vorm': { length: 5, width: 4 },
  boog: { length: 4, width: 3 },
  'z-vorm': { length: 5, width: 4 },
  'z-vorm-inv': { length: 5, width: 4 },
  'vrije-vorm': { length: 6, width: 6 },
};

export const ELEMENT_DEFAULTS: Record<
  RoomElement['type'],
  { label: string; width: number; height: number }
> = {
  deur: { label: 'Deur', width: 1.0, height: 2.1 },
  raam: { label: 'Raam', width: 1.2, height: 1.2 },
  schuifdeur: { label: 'Schuifdeur', width: 2.1, height: 2.1 },
  openhaard: { label: 'Open haard', width: 1.2, height: 0.5 },
  radiator: { label: 'Radiator', width: 0.8, height: 0.2 },
  kolom: { label: 'Kolom', width: 0.3, height: 0.3 },
  badkuip: { label: 'Badkuip', width: 1.7, height: 0.8 },
  toilet: { label: 'Toilet', width: 0.4, height: 0.7 },
};
