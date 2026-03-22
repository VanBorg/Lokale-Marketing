import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import type { CornerFillInfo } from './canvasTypes';

interface CornerFillWandProps {
  fill: CornerFillInfo;
  scale: number;
  stagePos: { x: number; y: number };
  viewportSize: { width: number; height: number };
  onFill: (fill: CornerFillInfo) => void;
  onHoverStart: (fill: CornerFillInfo) => void;
  onHoverEnd: () => void;
}

export default function CornerFillWand({
  fill,
  scale,
  stagePos,
  viewportSize,
  onFill,
  onHoverStart,
  onHoverEnd,
}: CornerFillWandProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const btnSize = Math.max(28, Math.min(36, 32 / Math.sqrt(scale)));
  const iconSize = Math.round(btnSize * 0.45);

  const screenX = fill.wizardWorldPos.x * scale + stagePos.x;
  const screenY = fill.wizardWorldPos.y * scale + stagePos.y;
  const margin = 10;
  const clampedX = Math.max(btnSize / 2 + margin, Math.min(viewportSize.width - btnSize / 2 - margin, screenX));
  const clampedY = Math.max(btnSize / 2 + margin, Math.min(viewportSize.height - btnSize / 2 - margin, screenY));

  const dimLabel = `${fill.fillWm.toFixed(2).replace('.', ',')} × ${fill.fillHm.toFixed(2).replace('.', ',')} m`;

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
        className="flex items-center justify-center rounded-full shadow-lg border border-blue-400/40 bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500 hover:scale-110 active:scale-90 transition-all cursor-pointer animate-wizard-pulse"
        style={{ width: btnSize, height: btnSize }}
        onClick={(e) => {
          e.stopPropagation();
          onFill(fill);
        }}
        onMouseEnter={() => {
          setShowTooltip(true);
          onHoverStart(fill);
        }}
        onMouseLeave={() => {
          setShowTooltip(false);
          onHoverEnd();
        }}
        title={`Hoek opvullen — ${dimLabel}`}
      >
        <Maximize2 size={iconSize} strokeWidth={2.4} />
      </button>
      {showTooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-dark-card border border-dark-border shadow-xl text-[11px] text-light/80 font-medium pointer-events-none"
          style={{ top: btnSize + 8 }}
        >
          Hoek opvullen — {dimLabel}
        </div>
      )}
    </div>
  );
}
