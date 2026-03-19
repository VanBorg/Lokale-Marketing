import { useState, useCallback } from 'react';
import { Redo2, Undo2, Hammer, X } from 'lucide-react';
import { Vertex } from './types';
import { useTheme } from '../../hooks/useTheme';

/* ── Grid constants ───────────────────────────────────────────── */

const GRID_MIN = 0;
/** 10 nodes per axis (0…9 inclusive) → 10×10 dots, 1 m between neighbours. */
const GRID_AXIS_NODES = 10;
const GRID_MAX = GRID_MIN + GRID_AXIS_NODES - 1;
/** One compass step = 1 m along each axis; vertices snap to integer metres. */
const GRID_STEP = 1;
/** Grid lines + start dots: exactly GRID_AXIS_NODES positions each way. */
const METRE_GRID_VALUES = Array.from(
  { length: GRID_AXIS_NODES },
  (_, i) => GRID_MIN + i,
);

/* ── Directions ───────────────────────────────────────────────── */

type DirectionId = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const DIRECTIONS: Record<DirectionId, { dx: number; dy: number; label: string }> = {
  N:  { dx:  0, dy: -1, label: 'Omhoog' },
  NE: { dx:  1, dy: -1, label: 'Rechtsboven' },
  E:  { dx:  1, dy:  0, label: 'Rechts' },
  SE: { dx:  1, dy:  1, label: 'Rechtsonder' },
  S:  { dx:  0, dy:  1, label: 'Omlaag' },
  SW: { dx: -1, dy:  1, label: 'Linksonder' },
  W:  { dx: -1, dy:  0, label: 'Links' },
  NW: { dx: -1, dy: -1, label: 'Linksboven' },
};

/**
 * Circular compass layout — each direction has an angle.
 * We position buttons using trigonometry around a center point.
 */
const DIR_ANGLES: Record<DirectionId, number> = {
  N: 270, NE: 315, E: 0, SE: 45, S: 90, SW: 135, W: 180, NW: 225,
};

const DIR_ORDER: DirectionId[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/* ── Arrow icon ───────────────────────────────────────────────── */

function DirectionArrow({ id }: { id: DirectionId }) {
  const angle = DIR_ANGLES[id];
  const rad = (angle * Math.PI) / 180;
  const cx = 12, cy = 12;
  const tipDist = 9;
  const tipX = cx + Math.cos(rad) * tipDist;
  const tipY = cy + Math.sin(rad) * tipDist;
  const tailDist = 2;
  const tailX = cx + Math.cos(rad) * tailDist;
  const tailY = cy + Math.sin(rad) * tailDist;

  const ux = Math.cos(rad), uy = Math.sin(rad);
  const px = -uy, py = ux;
  const headLen = 4;
  const headW = 0.5;

  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]">
      <line
        x1={tailX} y1={tailY} x2={tipX} y2={tipY}
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      />
      <polyline
        points={`
          ${tipX - ux * headLen + px * headLen * headW},${tipY - uy * headLen + py * headLen * headW}
          ${tipX},${tipY}
          ${tipX - ux * headLen - px * headLen * headW},${tipY - uy * headLen - py * headLen * headW}
        `}
        fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Geometry helpers ─────────────────────────────────────────── */

function clampToGrid(v: number): number {
  return Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(v / GRID_STEP) * GRID_STEP));
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

/* ── Component ────────────────────────────────────────────────── */

interface FreeFormBuilderProps {
  onConfirm: (vertices: Vertex[]) => void;
  onCancel: () => void;
}

export default function FreeFormBuilder({ onConfirm, onCancel }: FreeFormBuilderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [lastDirection, setLastDirection] = useState<{ dx: number; dy: number } | null>(null);
  const [, setHistory] = useState<Vertex[][]>([]);
  const [redoStack, setRedoStack] = useState<Vertex[][]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasStarted = vertices.length > 0;
  const currentPoint = hasStarted ? vertices[vertices.length - 1] : null;
  const startPoint = hasStarted ? vertices[0] : null;

  /* ── Colors ── */
  const dotColor = isDark ? '#ffffff' : '#1a1a1a';
  const lineColor = '#FF5C1A';
  const lineOutlineColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
  const gridLineMinor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const gridLineMajor = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.11)';
  const gridDotColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
  const gridDotHoverColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';

  /* ── Handlers ── */
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
      if (vertices.length > 1) setHistory(h => [...h, vertices]);

      if (wouldClose && canClose) {
        setVertices(v => [...v, next]);
        setShowConfirm(true);
        setLastDirection(d);
        return;
      }
      if (wouldClose && !canClose) return;

      setVertices(v => [...v, next]);
      setLastDirection(d);
    },
    [currentPoint, startPoint, vertices],
  );

  const handleUndo = useCallback(() => {
    if (vertices.length <= 1) return;
    setRedoStack(r => [...r, vertices]);
    setVertices(vertices.slice(0, -1));
    setLastDirection(null);
    setHistory(h => (h.length > 0 ? h.slice(0, -1) : []));
    setShowConfirm(false);
  }, [vertices]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setVertices(next);
    setRedoStack(r => r.slice(0, -1));
    setHistory(h => [...h, vertices]);
  }, [redoStack, vertices]);

  const handleConfirmYes = useCallback(() => {
    onConfirm(vertices.length > 1 ? vertices.slice(0, -1) : vertices);
  }, [vertices, onConfirm]);

  const handleConfirmNo = useCallback(() => {
    setShowConfirm(false);
    setVertices(v => v.slice(0, -1));
    setLastDirection(null);
  }, []);

  /* ── Disable logic ── */
  const backDisabled = vertices.length <= 1;
  const redoDisabled = redoStack.length === 0;
  const forbiddenDir = lastDirection && vertices.length >= 2 ? directionOpposite(lastDirection) : null;
  const isForbidden = (d: { dx: number; dy: number }): boolean => {
    if (!hasStarted) return true;
    if (!forbiddenDir) return false;
    return d.dx === forbiddenDir.dx && d.dy === forbiddenDir.dy;
  };

  /* ── SVG canvas: span from corner dot (0,0) to corner dot (GRID_MAX, GRID_MAX); pad so edge dots fit inside the box */
  const gridSpanPx = GRID_MAX * PX_PER_M;
  const viewPad = 6;
  const viewBoxSize = gridSpanPx + 2 * viewPad;
  const w = gridSpanPx;
  const h = gridSpanPx;
  const toSX = (x: number) => x * PX_PER_M;
  const toSY = (y: number) => y * PX_PER_M;

  /* ── Compass layout constants ── */
  const compassSize = 140;
  const compassCenter = compassSize / 2;
  const btnRadius = 50; // distance from center to button
  const btnSize = 34;   // button diameter

  return (
    <div className="p-4 border-b border-dark-border flex flex-col gap-3">
      {/* ── Title ── */}
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider">
        Vrije vorm tekenen
      </h3>

      {/* ── SVG Canvas ── */}
      <div
        className="w-full rounded-lg border px-1 py-1.5"
        style={{
          background: isDark ? 'rgba(26,26,26,0.6)' : 'rgba(245,245,245,0.8)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
        }}
      >
        <div className="w-full aspect-square max-h-[min(72vw,320px)] sm:max-h-[360px] mx-auto">
          <svg
            viewBox={`-${viewPad} -${viewPad} ${viewBoxSize} ${viewBoxSize}`}
            className="size-full block"
            preserveAspectRatio="xMidYMid meet"
          >
          {/* Grid lines every 1 m; slightly stronger on even metres for orientation */}
          {METRE_GRID_VALUES.map(v => {
            const major = v % 2 === 0;
            const stroke = major ? gridLineMajor : gridLineMinor;
            const sw = major ? 0.55 : 0.35;
            return (
              <g key={`grid-${v}`}>
                <line x1={toSX(v)} y1={0} x2={toSX(v)} y2={h} stroke={stroke} strokeWidth={sw} />
                <line x1={0} y1={toSY(v)} x2={w} y2={toSY(v)} stroke={stroke} strokeWidth={sw} />
              </g>
            );
          })}

          {/* Start dots on 1 m lattice — aligns with each compass step */}
          {METRE_GRID_VALUES.map(gx =>
            METRE_GRID_VALUES.map(gy => (
              <circle
                key={`dot-${gx}-${gy}`}
                cx={toSX(gx)} cy={toSY(gy)}
                r={!hasStarted ? 3 : 1.5}
                fill={gridDotColor}
                style={!hasStarted ? { cursor: 'pointer' } : { pointerEvents: 'none' }}
                onClick={!hasStarted ? () => handleStartClick(gx, gy) : undefined}
                onMouseEnter={!hasStarted ? e => e.currentTarget.setAttribute('fill', gridDotHoverColor) : undefined}
                onMouseLeave={!hasStarted ? e => e.currentTarget.setAttribute('fill', gridDotColor) : undefined}
              />
            )),
          )}

          {/* Shape outline — contrast stroke */}
          {vertices.length > 1 && (
            <polyline
              points={vertices.map(v => `${toSX(v.x)},${toSY(v.y)}`).join(' ')}
              fill="none" stroke={lineOutlineColor}
              strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
            />
          )}
          {/* Shape outline — main */}
          {vertices.length > 1 && (
            <polyline
              points={vertices.map(v => `${toSX(v.x)},${toSY(v.y)}`).join(' ')}
              fill="none" stroke={lineColor}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            />
          )}

          {/* Intermediate dots */}
          {vertices.length > 2 &&
            vertices.slice(1, -1).map((v, i) => (
              <circle key={`vert-${i}`} cx={toSX(v.x)} cy={toSY(v.y)} r={2.5} fill={lineColor} />
            ))}

          {/* Start point */}
          {startPoint && (
            <circle
              cx={toSX(startPoint.x)} cy={toSY(startPoint.y)}
              r={5} fill={dotColor} stroke={lineColor} strokeWidth={2}
            />
          )}

          {/* Current point */}
          {currentPoint && startPoint && vertices.length > 1 && !isSamePoint(currentPoint, startPoint) && (
            <circle
              cx={toSX(currentPoint.x)} cy={toSY(currentPoint.y)}
              r={4} fill={dotColor} stroke={lineColor} strokeWidth={1.5}
            />
          )}
          </svg>
        </div>
      </div>

      {/* ── Controls: Compass (left) + Actions (right) ── */}
      <div className="flex items-center gap-3">

        {/* ── Compass Rose ── */}
        <div
          className="relative shrink-0 rounded-xl border"
          style={{
            width: compassSize,
            height: compassSize,
            background: isDark
              ? 'linear-gradient(135deg, rgba(30,30,30,0.9), rgba(20,20,20,0.95))'
              : 'linear-gradient(135deg, rgba(250,250,250,0.95), rgba(240,240,240,0.9))',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
          }}
        >
          {/* Center: Hammer icon */}
          <div
            className="absolute flex items-center justify-center rounded-full"
            style={{
              width: 32,
              height: 32,
              left: compassCenter - 16,
              top: compassCenter - 16,
              background: 'linear-gradient(135deg, #FF5C1A, #FF8A50)',
              boxShadow: '0 2px 8px rgba(255,92,26,0.3)',
            }}
          >
            <Hammer size={16} className="text-white" strokeWidth={2.5} />
          </div>

          {/* 8 Direction buttons arranged in a circle */}
          {DIR_ORDER.map(id => {
            const angle = DIR_ANGLES[id];
            const rad = (angle * Math.PI) / 180;
            const bx = compassCenter + Math.cos(rad) * btnRadius - btnSize / 2;
            const by = compassCenter + Math.sin(rad) * btnRadius - btnSize / 2;
            const d = DIRECTIONS[id];
            const disabled = isForbidden(d);

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleDirection(d)}
                disabled={disabled}
                title={d.label}
                className="absolute flex items-center justify-center rounded-full transition-all duration-150"
                style={{
                  width: btnSize,
                  height: btnSize,
                  left: bx,
                  top: by,
                  background: disabled
                    ? (isDark ? 'rgba(40,40,40,0.6)' : 'rgba(230,230,230,0.6)')
                    : (isDark ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.95)'),
                  border: `1.5px solid ${
                    disabled
                      ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)')
                      : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')
                  }`,
                  color: disabled
                    ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')
                    : (isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'),
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  boxShadow: disabled ? 'none' : '0 1px 4px rgba(0,0,0,0.15)',
                }}
                onMouseEnter={e => {
                  if (disabled) return;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#FF5C1A';
                  (e.currentTarget as HTMLButtonElement).style.color = '#FF5C1A';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(255,92,26,0.25)';
                }}
                onMouseLeave={e => {
                  if (disabled) return;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
                  (e.currentTarget as HTMLButtonElement).style.color = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)';
                }}
              >
                <DirectionArrow id={id} />
              </button>
            );
          })}
        </div>

        {/* ── Action buttons (right column) ── */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={backDisabled}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              transition-colors duration-150
              ${backDisabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-dark-hover cursor-pointer'}
              bg-dark-card border border-dark-border text-light/70
            `}
          >
            <Undo2 size={14} />
            <span>Terug</span>
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={redoDisabled}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              transition-colors duration-150
              ${redoDisabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-dark-hover cursor-pointer'}
              bg-dark-card border border-dark-border text-light/70
            `}
          >
            <Redo2 size={14} />
            <span>Volgende</span>
          </button>

          <div className="h-px bg-dark-border my-0.5" />

          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/8 text-red-400 border border-red-500/15 hover:bg-red-500/15 transition-colors cursor-pointer"
          >
            <X size={14} />
            <span>Annuleren</span>
          </button>

          {/* Segment count */}
          {vertices.length > 1 && (
            <div className="px-3 py-1.5 text-[10px] text-light/30 tabular-nums">
              {vertices.length - 1} segment{vertices.length - 1 !== 1 ? 'en' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm modal ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm text-light/90 mb-4">
              Vorm is gesloten. Wil je deze kamer plaatsen op de plattegrond?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleConfirmNo}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors cursor-pointer"
              >
                Nee, verder bewerken
              </button>
              <button
                onClick={handleConfirmYes}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors cursor-pointer"
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