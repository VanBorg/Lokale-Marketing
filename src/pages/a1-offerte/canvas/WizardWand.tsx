import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { GapInfo } from './canvasTypes';

interface WizardWandProps {
  gap: GapInfo;
  scale: number;
  stagePos: { x: number; y: number };
  onFill: (gap: GapInfo) => void;
  onHoverStart: (gap: GapInfo) => void;
  onHoverEnd: () => void;
}

export default function WizardWand({
  gap,
  scale,
  stagePos,
  onFill,
  onHoverStart,
  onHoverEnd,
}: WizardWandProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const screenX = gap.wizardWorldPos.x * scale + stagePos.x;
  const screenY = gap.wizardWorldPos.y * scale + stagePos.y;
  const btnSize = Math.max(28, Math.min(36, 32 / Math.sqrt(scale)));
  const iconSize = Math.round(btnSize * 0.5);

  return (
    <div
      className="absolute z-20"
      style={{
        left: screenX - btnSize / 2,
        top: screenY - btnSize / 2,
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        className="flex items-center justify-center rounded-full shadow-lg border border-amber-400/40 bg-gradient-to-br from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 hover:scale-110 active:scale-90 transition-all cursor-pointer animate-wizard-pulse"
        style={{ width: btnSize, height: btnSize }}
        onClick={(e) => {
          e.stopPropagation();
          onFill(gap);
        }}
        onMouseEnter={() => {
          setShowTooltip(true);
          onHoverStart(gap);
        }}
        onMouseLeave={() => {
          setShowTooltip(false);
          onHoverEnd();
        }}
      >
        <Wand2 size={iconSize} strokeWidth={2.5} />
      </button>
      {showTooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-dark-card border border-dark-border shadow-xl text-[11px] text-light/80 font-medium pointer-events-none"
          style={{ top: btnSize + 6 }}
        >
          Ruimte opvullen
          <span className="ml-1.5 text-[10px] text-light/40 font-mono">[W]</span>
        </div>
      )}
    </div>
  );
}
