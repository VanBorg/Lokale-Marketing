import * as rechthoek from './rechthoek';
import * as langwerpig from './langwerpig';
import * as lVorm from './l-vorm';
import * as boog from './boog';
import * as tVorm from './t-vorm';
import * as uVorm from './u-vorm';
import * as zVorm from './z-vorm';
import * as iVorm from './i-vorm';
import * as vrijVorm from './vrije-vorm';

export type ShapeConfig = {
  SNAP_WALL_INDICES: number[] | 'auto';
  INNER_WALL_INDICES?: number[] | 'auto';
  WALL_LABELS?: string[];
  VERTEX_COUNT: number | null;
  IS_ORTHOGONAL: boolean;
};

const SHAPE_MAP: Record<string, ShapeConfig> = {
  'rechthoek': rechthoek,
  'langwerpig': langwerpig,
  'l-vorm': lVorm,
  'boog': boog,
  't-vorm': tVorm,
  'u-vorm': uVorm,
  'z-vorm': zVorm,
  'i-vorm': iVorm,
  'vrije-vorm': vrijVorm,
};

export function getShapeConfig(shape: string): ShapeConfig {
  return SHAPE_MAP[shape] ?? vrijVorm;
}
