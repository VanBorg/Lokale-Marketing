import type { Room, Vertex } from './roomTypes';

export function getShapeType(_shape: string): Room['shapeType'] {
  return 'rect';
}

export function getShapePoints(shape: string, w: number, h: number): number[] {
  switch (shape) {
    case 'l-vorm':
      return [0, 0, w * 0.5, 0, w * 0.5, h * 0.5, w, h * 0.5, w, h, 0, h];
    case 'i-vorm': {
      const barH = h * 0.25;
      const stemW = w * 0.3;
      const sx = (w - stemW) / 2;
      const ex = sx + stemW;
      return [
        0, 0, w, 0, w, barH, ex, barH,
        ex, h - barH, w, h - barH, w, h,
        0, h, 0, h - barH, sx, h - barH,
        sx, barH, 0, barH,
      ];
    }
    case 't-vorm':
      return [
        0, 0, w, 0, w, h * 0.4, w * 0.67, h * 0.4,
        w * 0.67, h, w * 0.33, h, w * 0.33, h * 0.4, 0, h * 0.4,
      ];
    case 'u-vorm':
      return [
        0, 0, w * 0.33, 0, w * 0.33, h * 0.6,
        w * 0.67, h * 0.6, w * 0.67, 0, w, 0, w, h, 0, h,
      ];
    case 'boog':
      return [w * 0.5, 0, w, 0, w, h, w * 0.5, h, w * 0.5, h * 0.5, 0, h * 0.5, 0, 0];
    case 'z-vorm':
      return [0, 0, w * 0.5, 0, w * 0.5, h * 0.4, w, h * 0.4, w, h, w * 0.5, h, w * 0.5, h * 0.6, 0, h * 0.6];
    case 'z-vorm-inv':
      return [w, 0, w * 0.5, 0, w * 0.5, h * 0.4, 0, h * 0.4, 0, h, w * 0.5, h, w * 0.5, h * 0.6, w, h * 0.6];
    case 'vrije-vorm':
      return [0, 0, w, 0, w, h, 0, h];
    case 'rechthoek':
    default:
      return [0, 0, w, 0, w, h, 0, h];
  }
}

/** Shoelace formula: area of closed polygon (vertices in order). */
export function polygonArea(vertices: Vertex[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}
