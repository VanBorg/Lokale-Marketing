import React, { useRef, useCallback, useEffect, useState } from 'react';

interface RotationDialProps {
  rotation: number;
  onChange: (deg: number) => void;
  disabled?: boolean;
}

const RADIUS = 42;
const CENTER = 50;
const SNAP_STEP = 5;

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

export default function RotationDial({ rotation, onChange, disabled }: RotationDialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [inputVal, setInputVal] = useState(String(Math.round(normDeg(rotation))));

  useEffect(() => {
    setInputVal(String(Math.round(normDeg(rotation))));
  }, [rotation]);

  const angleFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return rotation;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
    let deg = rad * 180 / Math.PI + 90;
    deg = normDeg(deg);
    return Math.round(deg / SNAP_STEP) * SNAP_STEP;
  }, [rotation]);

  const onPointerDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    e.preventDefault();
    dragging.current = true;
    onChange(normDeg(angleFromEvent(e)));
  }, [disabled, angleFromEvent, onChange]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onChange(normDeg(angleFromEvent(e)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [angleFromEvent, onChange]);

  const rad = (normDeg(rotation) - 90) * Math.PI / 180;
  const pointerX = CENTER + Math.cos(rad) * RADIUS;
  const pointerY = CENTER + Math.sin(rad) * RADIUS;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
  };

  const commitInput = () => {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed)) {
      onChange(normDeg(Math.round(parsed / SNAP_STEP) * SNAP_STEP));
    } else {
      setInputVal(String(Math.round(normDeg(rotation))));
    }
  };

  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="w-[100px] h-[100px] cursor-pointer select-none shrink-0"
        onMouseDown={onPointerDown}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="currentColor" strokeWidth="2" className="text-light/20" />
        {[0, 90, 180, 270].map(tick => {
          const tr = (tick - 90) * Math.PI / 180;
          const ix = CENTER + Math.cos(tr) * (RADIUS - 6);
          const iy = CENTER + Math.sin(tr) * (RADIUS - 6);
          const ox = CENTER + Math.cos(tr) * RADIUS;
          const oy = CENTER + Math.sin(tr) * RADIUS;
          return <line key={tick} x1={ix} y1={iy} x2={ox} y2={oy} stroke="currentColor" strokeWidth="1.5" className="text-light/30" />;
        })}
        <line x1={CENTER} y1={CENTER} x2={pointerX} y2={pointerY} stroke="#FF5C1A" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={pointerX} cy={pointerY} r="4.5" fill="#FF5C1A" />
        <circle cx={CENTER} cy={CENTER} r="3" fill="currentColor" className="text-light/40" />
      </svg>
      <div className="flex flex-col gap-1">
        <input
          type="number"
          min={0}
          max={360}
          step={SNAP_STEP}
          value={inputVal}
          onChange={handleInputChange}
          onBlur={commitInput}
          onKeyDown={e => { if (e.key === 'Enter') commitInput(); }}
          disabled={disabled}
          className="w-16 px-2 py-1 text-sm rounded-lg bg-dark-card border border-dark-border text-light text-center focus:border-accent focus:outline-none"
        />
        <span className="text-[10px] text-light/40 text-center">graden</span>
      </div>
    </div>
  );
}
