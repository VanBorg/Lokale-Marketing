import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { WizardTarget } from './canvasTypes';

interface WizardWandProps {
  target: WizardTarget;
  scale: number;
  stagePos: { x: number; y: number };
  onFill: (target: WizardTarget) => void;
  onHoverStart: (target: WizardTarget) => void;
  onHoverEnd: () => void;
}

function directionInfo(target: WizardTarget) {
  const { nx, ny } = target.direction;
  if (Math.abs(nx) >= Math.abs(ny)) {
    return nx >= 0
      ? { label: 'Verschuif naar rechts', Arrow: ArrowRight }
      : { label: 'Verschuif naar links', Arrow: ArrowLeft };
  }
  return ny >= 0
    ? { label: 'Verschuif omlaag', Arrow: ArrowDown }
    : { label: 'Verschuif omhoog', Arrow: ArrowUp };
}

export default function WizardWand({
  target,
  scale,
  stagePos,
  onFill,
  onHoverStart,
  onHoverEnd,
}: WizardWandProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { label, Arrow } = directionInfo(target);

  const screenX = target.wizardWorldPos.x * scale + stagePos.x;
  const screenY = target.wizardWorldPos.y * scale + stagePos.y;
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
          onFill(target);
        }}
        onMouseEnter={() => {
          setShowTooltip(true);
          onHoverStart(target);
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
