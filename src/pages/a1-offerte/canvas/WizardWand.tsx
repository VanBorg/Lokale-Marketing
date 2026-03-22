import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { GapInfo } from './canvasTypes';

interface WizardWandProps {
  target: GapInfo;
  scale: number;
  stagePos: { x: number; y: number };
  viewportSize: { width: number; height: number };
  onFill: (target: GapInfo) => void;
  onHoverStart: (target: GapInfo, mode: 'fill' | 'carve') => void;
  onHoverEnd: () => void;
}

export default function WizardWand({
  target,
  scale,
  stagePos,
  viewportSize,
  onFill,
  onHoverStart,
  onHoverEnd,
}: WizardWandProps) {
  const btnSize = Math.max(28, Math.min(36, 32 / Math.sqrt(scale)));
  const iconSize = Math.round(btnSize * 0.45);

  const screenX = target.wizardWorldPos.x * scale + stagePos.x;
  const screenY = target.wizardWorldPos.y * scale + stagePos.y;
  const margin = 10;
  const clampedX = Math.max(btnSize / 2 + margin, Math.min(viewportSize.width - btnSize / 2 - margin, screenX));
  const clampedY = Math.max(btnSize / 2 + margin, Math.min(viewportSize.height - btnSize / 2 - margin, screenY));

  const angleDeg = Math.atan2(target.direction.ny, target.direction.nx) * 180 / Math.PI;

  return (
    <div
      className="absolute z-20"
      style={{
        left: clampedX - btnSize / 2,
        top: clampedY - btnSize / 2,
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        className="flex items-center justify-center rounded-full shadow-lg border border-amber-400/40 bg-gradient-to-br from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 hover:scale-110 active:scale-90 transition-all cursor-pointer animate-wizard-pulse"
        style={{ width: btnSize, height: btnSize }}
        onClick={(e) => {
          e.stopPropagation();
          onFill(target);
        }}
        onMouseEnter={() => onHoverStart(target, 'fill')}
        onMouseLeave={() => onHoverEnd()}
        title="Muur flush trekken"
      >
        <div style={{ transform: `rotate(${angleDeg}deg)` }}>
          <ArrowRight size={iconSize} strokeWidth={2.8} />
        </div>
      </button>
    </div>
  );
}
