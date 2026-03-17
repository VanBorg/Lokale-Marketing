import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { GapInfo } from './canvasTypes';

interface WizardWandProps {
  gap: GapInfo;
  scale: number;
  stagePos: { x: number; y: number };
  onFill: (gap: GapInfo) => void;
  onHoverStart: (gap: GapInfo) => void;
  onHoverEnd: () => void;
}

function directionInfo(gap: GapInfo) {
  const pair = gap.edgePairs[0];
  if (!pair) return { label: 'Muur verplaatsen', Arrow: ArrowRight };
  const positive = pair.refPos > pair.targetPos;
  if (pair.axis === 'x') {
    return positive
      ? { label: 'Muur naar rechts', Arrow: ArrowRight }
      : { label: 'Muur naar links', Arrow: ArrowLeft };
  }
  return positive
    ? { label: 'Muur omlaag', Arrow: ArrowDown }
    : { label: 'Muur omhoog', Arrow: ArrowUp };
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
  const { label, Arrow } = directionInfo(gap);

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
        <Arrow size={iconSize} strokeWidth={2.5} />
      </button>
      {showTooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-dark-card border border-dark-border shadow-xl text-[11px] text-light/80 font-medium pointer-events-none"
          style={{ top: btnSize + 6 }}
        >
          {label}
          <span className="ml-1.5 text-[10px] text-light/40 font-mono">[W]</span>
        </div>
      )}
    </div>
  );
}
