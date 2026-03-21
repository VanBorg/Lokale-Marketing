import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import type { GapInfo } from './canvasTypes';

interface WizardWandProps {
  target: GapInfo;
  scale: number;
  stagePos: { x: number; y: number };
  viewportSize: { width: number; height: number };
  onFill: (target: GapInfo) => void;
  onCarve: (target: GapInfo) => void;
  onHoverStart: (target: GapInfo, mode: 'fill' | 'carve') => void;
  onHoverEnd: () => void;
}

export default function WizardWand({
  target,
  scale,
  stagePos,
  viewportSize,
  onFill,
  onCarve,
  onHoverStart,
  onHoverEnd,
}: WizardWandProps) {
  const [tooltip, setTooltip] = useState<null | 'fill' | 'carve'>(null);

  const btnSize = Math.max(28, Math.min(36, 32 / Math.sqrt(scale)));
  const iconSize = Math.round(btnSize * 0.45);
  const screenX = target.wizardWorldPos.x * scale + stagePos.x;
  const screenY = target.wizardWorldPos.y * scale + stagePos.y;
  const margin = 10;
  const clampedScreenX = Math.max(btnSize / 2 + margin, Math.min(viewportSize.width - btnSize / 2 - margin, screenX));
  const clampedScreenY = Math.max(btnSize / 2 + margin, Math.min(viewportSize.height - btnSize / 2 - margin, screenY));

  return (
    <div
      className="absolute z-20"
      style={{
        left: clampedScreenX - btnSize / 2,
        top: clampedScreenY - btnSize / 2,
        pointerEvents: 'auto',
      }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex items-center justify-center rounded-full shadow-lg border border-amber-400/40 bg-gradient-to-br from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 hover:scale-110 active:scale-90 transition-all cursor-pointer animate-wizard-pulse"
          style={{ width: btnSize, height: btnSize }}
          onClick={(e) => {
            e.stopPropagation();
            onFill(target);
          }}
          onMouseEnter={() => {
            setTooltip('fill');
            onHoverStart(target, 'fill');
          }}
          onMouseLeave={() => {
            setTooltip(null);
            onHoverEnd();
          }}
          title="Lege ruimte opvullen (+)"
        >
          <Plus size={iconSize} strokeWidth={2.8} />
        </button>
        <button
          type="button"
          className="flex items-center justify-center rounded-full shadow-lg border border-sky-400/40 bg-gradient-to-br from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 hover:scale-110 active:scale-90 transition-all cursor-pointer"
          style={{ width: btnSize, height: btnSize }}
          onClick={(e) => {
            e.stopPropagation();
            onCarve(target);
          }}
          onMouseEnter={() => {
            setTooltip('carve');
            onHoverStart(target, 'carve');
          }}
          onMouseLeave={() => {
            setTooltip(null);
            onHoverEnd();
          }}
          title="Lege ruimte terugnemen (-)"
        >
          <Minus size={iconSize} strokeWidth={2.8} />
        </button>
      </div>
      {tooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-dark-card border border-dark-border shadow-xl text-[11px] text-light/80 font-medium pointer-events-none"
          style={{ top: btnSize + 8 }}
        >
          {tooltip === 'fill' ? 'Lege ruimte opvullen (+)' : 'Lege ruimte terugnemen (-)'}
        </div>
      )}
    </div>
  );
}
