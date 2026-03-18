import { useState, useCallback } from 'react';
import { Vertex } from './types';
import { useTheme } from '../../hooks/useTheme';

const GRID_MIN = 0;
const GRID_MAX = 12;
const GRID_STEP = 2;

const GRID_VALUES = [0, 2, 4, 6, 8, 10, 12] as const;

type DirectionId = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const DIRECTIONS: Record<DirectionId, { dx: number; dy: number; label: string }> = {
  N:  { dx:  0, dy: -2, label: 'Recht omhoog' },
  NE: { dx:  2, dy: -2, label: 'Schuin rechtsboven' },
  E:  { dx:  2, dy:  0, label: 'Recht rechts' },
  SE: { dx:  2, dy:  2, label: 'Schuin rechtsonder' },
  S:  { dx:  0, dy:  2, label: 'Recht omlaag' },
  SW: { dx: -2, dy:  2, label: 'Schuin linksonder' },
  W:  { dx: -2, dy:  0, label: 'Recht links' },
  NW: { dx: -2, dy: -2, label: 'Schuin linksboven' },
};

const COMPASS_GRID: (DirectionId | null)[][] = [
  ['NW', 'N',  'NE'],
  ['W',  null, 'E'],
  ['SW', 'S',  'SE'],
];

const ARROW_TARGETS: Record<DirectionId, { x: number; y: number }> = {
  N:  { x: 12, y:  3 },
  NE: { x: 21, y:  3 },
  E:  { x: 21, y: 12 },
  SE: { x: 21, y: 21 },
  S:  { x: 12, y: 21 },
  SW: { x:  3, y: 21 },
  W:  { x:  3, y: 12 },
  NW: { x:  3, y:  3 },
};

function DirectionArrow({ id }: { id: DirectionId }) {
  const t = ARROW_TARGETS[id];
  const cx = 12, cy = 12;
  const dx = t.x - cx, dy = t.y - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const s = 4;
  const h1x = t.x - ux * s + px * s * 0.4;
  const h1y = t.y - uy * s + py * s * 0.4;
  const h2x = t.x - ux * s - px * s * 0.4;
  const h2y = t.y - uy * s - py * s * 0.4;

  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <line x1={cx} y1={cy} x2={t.x} y2={t.y} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polyline
        points={`${h1x},${h1y} ${t.x},${t.y} ${h2x},${h2y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function clampToGrid(v: number): number {
  const n = Math.round(v / GRID_STEP) * GRID_STEP;
  return Math.max(GRID_MIN, Math.min(GRID_MAX, n));
}

function addDirection({ x, y }: Vertex, d: { dx: number; dy: number }): Vertex {
  return { x: clampToGrid(x + d.dx), y: clampToGrid(y + d.dy) };
}

function directionOpposite(d: { dx: number; dy: number }): { dx: number; dy: number } {
  return { dx: -d.dx, dy: -d.dy };
}

function isSamePoint(a: Vertex, b: Vertex): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

const PX_PER_M = 20;

interface FreeFormBuilderProps {
  onConfirm: (vertices: Vertex[]) => void;
  onCancel: () => void;
}

export default function FreeFormBuilder({ onConfirm, onCancel }: FreeFormBuilderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [lastDirection, setLastDirection] = useState<{ dx: number; dy: number } | null>(null);
  const [history, setHistory] = useState<Vertex[][]>([]);
  const [redoStack, setRedoStack] = useState<Vertex[][]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasStarted = vertices.length > 0;
  const currentPoint = hasStarted ? vertices[vertices.length - 1] : null;
  const startPoint = hasStarted ? vertices[0] : null;

  const dotColor = isDark ? '#ffffff' : '#1a1a1a';
  const lineColor = '#FF5C1A';
  const lineOutlineColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)';
  const gridDotColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
  const gridDotHoverColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';

  const handleStartClick = useCallback((x: number, y: number) => {
    setVertices([{ x, y }]);
    setLastDirection(null);
    setHistory([]);
    setRedoStack([]);
  }, []);

  const handleDirection = useCallback(
    (d: { dx: number; dy: number }) => {
      if (!currentPoint || !startPoint) return;
      const next = addDirection(currentPoint, d);
      const wouldClose = vertices.length >= 2 && isSamePoint(next, startPoint);
      const canClose = wouldClose && vertices.length >= 3;

      setRedoStack([]);
      if (vertices.length > 1) {
        setHistory((h) => [...h, vertices]);
      }

      if (wouldClose && canClose) {
        setVertices((v) => [...v, next]);
        setShowConfirm(true);
        setLastDirection(d);
        return;
      }
      if (wouldClose && !canClose) return;

      setVertices((v) => [...v, next]);
      setLastDirection(d);
    },
    [currentPoint, startPoint, vertices],
  );

  const handleUndo = useCallback(() => {
    if (vertices.length <= 1) return;
    setRedoStack((r) => [...r, vertices]);
    setVertices(vertices.slice(0, -1));
    setLastDirection(null);
    setHistory((h) => (h.length > 0 ? h.slice(0, -1) : []));
    setShowConfirm(false);
  }, [vertices]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setVertices(next);
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, vertices]);
  }, [redoStack, vertices]);

  const handleConfirmYes = useCallback(() => {
    const closed = vertices.length > 1 ? vertices.slice(0, -1) : vertices;
    onConfirm(closed);
  }, [vertices, onConfirm]);

  const handleConfirmNo = useCallback(() => {
    setShowConfirm(false);
    setVertices((v) => v.slice(0, -1));
    setLastDirection(null);
  }, []);

  const backDisabled = vertices.length <= 1;
  const redoDisabled = redoStack.length === 0;

  const forbiddenDirection = lastDirection && vertices.length >= 2 ? directionOpposite(lastDirection) : null;
  const isForbidden = (d: { dx: number; dy: number }): boolean => {
    if (!hasStarted) return true;
    if (!forbiddenDirection) return false;
    return d.dx === forbiddenDirection.dx && d.dy === forbiddenDirection.dy;
  };

  const w = (GRID_MAX - GRID_MIN) * PX_PER_M;
  const h = w;
  const toSX = (x: number) => x * PX_PER_M;
  const toSY = (y: number) => y * PX_PER_M;

  return (
    <div className="p-4 border-b border-dark-border flex flex-col gap-4">
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider">
        Vrij vorm tekenen
      </h3>
      <p className="text-xs text-light/60">
        {!hasStarted
          ? 'Klik op een rasterpunt om te beginnen.'
          : 'Klik een richting om een lijn van 2 m te plaatsen. Sluit de vorm door terug te gaan naar het startpunt.'}
      </p>

      <div className="flex justify-center bg-dark-card rounded-lg border border-dark-border p-2">
        <svg
          width={w + 2}
          height={h + 2}
          viewBox={`-1 -1 ${w + 2} ${h + 2}`}
          className="overflow-visible"
        >
          {/* Grid lines */}
          {GRID_VALUES.map((v) => (
            <g key={`grid-${v}`}>
              <line x1={toSX(v)} y1={0} x2={toSX(v)} y2={h} stroke={gridLineColor} strokeWidth="0.5" />
              <line x1={0} y1={toSY(v)} x2={w} y2={toSY(v)} stroke={gridLineColor} strokeWidth="0.5" />
            </g>
          ))}

          {/* Grid intersection dots — clickable when no start point */}
          {GRID_VALUES.map((gx) =>
            GRID_VALUES.map((gy) => (
              <circle
                key={`dot-${gx}-${gy}`}
                cx={toSX(gx)}
                cy={toSY(gy)}
                r={!hasStarted ? 4 : 2}
                fill={gridDotColor}
                style={!hasStarted ? { cursor: 'pointer' } : { pointerEvents: 'none' }}
                onClick={!hasStarted ? () => handleStartClick(gx, gy) : undefined}
                onMouseEnter={!hasStarted ? (e) => e.currentTarget.setAttribute('fill', gridDotHoverColor) : undefined}
                onMouseLeave={!hasStarted ? (e) => e.currentTarget.setAttribute('fill', gridDotColor) : undefined}
              />
            )),
          )}

          {/* Shape outline — background stroke for contrast */}
          {vertices.length > 1 && (
            <polyline
              points={vertices.map((v) => `${toSX(v.x)},${toSY(v.y)}`).join(' ')}
              fill="none"
              stroke={lineOutlineColor}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* Shape outline — main line */}
          {vertices.length > 1 && (
            <polyline
              points={vertices.map((v) => `${toSX(v.x)},${toSY(v.y)}`).join(' ')}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Intermediate vertex dots */}
          {vertices.length > 2 &&
            vertices.slice(1, -1).map((v, i) => (
              <circle key={`vert-${i}`} cx={toSX(v.x)} cy={toSY(v.y)} r={2.5} fill={lineColor} />
            ))}

          {/* Start point */}
          {startPoint && (
            <circle
              cx={toSX(startPoint.x)}
              cy={toSY(startPoint.y)}
              r={5}
              fill={dotColor}
              stroke={lineColor}
              strokeWidth={2}
            />
          )}

          {/* Current point (if different from start) */}
          {currentPoint && startPoint && vertices.length > 1 && !isSamePoint(currentPoint, startPoint) && (
            <circle
              cx={toSX(currentPoint.x)}
              cy={toSY(currentPoint.y)}
              r={4}
              fill={dotColor}
              stroke={lineColor}
              strokeWidth={1.5}
            />
          )}
        </svg>
      </div>

      {/* Direction buttons — 3x3 compass grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {COMPASS_GRID.flat().map((id, i) => {
          if (id === null) return <div key={`empty-${i}`} />;
          const d = DIRECTIONS[id];
          const disabled = isForbidden(d);
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleDirection(d)}
              disabled={disabled}
              title={d.label}
              className={`
                flex items-center justify-center p-2 rounded-lg transition-colors
                ${disabled
                  ? 'opacity-30 cursor-not-allowed bg-dark-card border border-dark-border'
                  : 'bg-dark-card border border-dark-border text-light/80 hover:border-accent hover:bg-accent/10 cursor-pointer'}
              `}
            >
              <DirectionArrow id={id} />
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={backDisabled}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-dark-card border border-dark-border text-light/70 hover:border-light/30 hover:text-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Ongedaan maken
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={redoDisabled}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-dark-card border border-dark-border text-light/70 hover:border-light/30 hover:text-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Opnieuw
        </button>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
      >
        Annuleren
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-light/90 mb-4">Klopt dit? Wil je deze kamer op de plattegrond plaatsen?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleConfirmNo}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors"
              >
                Nee, verder bewerken
              </button>
              <button
                onClick={handleConfirmYes}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
              >
                Ja, plaatsen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
