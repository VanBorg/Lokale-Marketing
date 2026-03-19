import { SpecialRoomConfig } from './types';
import { WC_CONFIG } from './wc';
import { BADKAMER_CONFIG } from './badkamer';
import { KAST_CONFIG } from './kast';
import { BERGING_CONFIG } from './berging';
import { DOORGANG_CONFIG } from './doorgang';
import { TRAPGAT_CONFIG } from './trapgat';
import { ERKER_CONFIG } from './erker';
import { BALKON_CONFIG } from './balkon';
import { NIS_CONFIG } from './nis';
import { SCHOUW_CONFIG } from './schouw';
import { PLATEAU_CONFIG } from './plateau';
import { LOGIA_CONFIG } from './logia';

export const SPECIAL_ROOM_CONFIGS: Record<string, SpecialRoomConfig> = {
  wc: WC_CONFIG,
  badkamer: BADKAMER_CONFIG,
  kast: KAST_CONFIG,
  berging: BERGING_CONFIG,
  doorgang: DOORGANG_CONFIG,
  trapgat: TRAPGAT_CONFIG,
  erker: ERKER_CONFIG,
  balkon: BALKON_CONFIG,
  nis: NIS_CONFIG,
  schouw: SCHOUW_CONFIG,
  plateau: PLATEAU_CONFIG,
  logia: LOGIA_CONFIG,
};

export function getSpecialRoomConfig(type: string): SpecialRoomConfig | null {
  return SPECIAL_ROOM_CONFIGS[type] ?? null;
}

export type { SpecialRoomConfig, SpecialRoomPlacementMode } from './types';
