import React from 'react';
import { ZoomIn, ZoomOut, Undo2, Redo2, Copy, Scissors, ClipboardPaste, CopyPlus } from 'lucide-react';
import { Room } from '../types';

interface CanvasToolbarProps {
  rooms: Room[];
  selectedRoom?: Room | null;
  clipboard?: Room | null;
  placingElement: boolean;
  scale: number;
  totals: { floor: number; walls: number; ceiling: number };
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export default function CanvasToolbar({
  rooms,
  selectedRoom,
  clipboard,
  placingElement,
  scale,
  totals,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDuplicate,
  onCopy,
  onCut,
  onPaste,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: CanvasToolbarProps) {
  return (
    <>
      {placingElement && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium shadow-lg">
          Klik op een muur om te plaatsen — Esc om te annuleren
        </div>
      )}

      {(selectedRoom || clipboard) && (
        <div className="h-10 shrink-0 flex items-center gap-2 px-4 border-t border-dark-border bg-dark-card">
          {selectedRoom && (
            <>
              <button
                onClick={onDuplicate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-light/60 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <CopyPlus size={14} />
                Dupliceer
              </button>
              <button
                onClick={onCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-light/60 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <Copy size={14} />
                Kopieer
              </button>
              <button
                onClick={onCut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-light/60 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <Scissors size={14} />
                Knippen
              </button>
            </>
          )}
          {clipboard && (
            <button
              onClick={onPaste}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-light/60 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
            >
              <ClipboardPaste size={14} />
              Plakken
            </button>
          )}
        </div>
      )}

      <div className="h-11 shrink-0 flex items-center gap-4 px-4 border-t border-dark-border bg-dark-card text-xs text-light/50">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <span>Kamers: <span className="text-light">{rooms.length}</span></span>
          <span>Vloer: <span className="text-light">{totals.floor.toFixed(1)} m²</span></span>
          <span>Wanden: <span className="text-light">{totals.walls.toFixed(1)} m²</span></span>
          <span>Plafond: <span className="text-light">{totals.ceiling.toFixed(1)} m²</span></span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Ongedaan maken (Ctrl+Z)"
              className="p-1.5 rounded font-semibold text-light/90 hover:text-light hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer disabled:font-normal"
            >
              <Undo2 size={15} strokeWidth={2.5} />
            </button>
          )}
          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Opnieuw (Ctrl+Y)"
              className="p-1.5 rounded font-semibold text-light/90 hover:text-light hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer disabled:font-normal"
            >
              <Redo2 size={15} strokeWidth={2.5} />
            </button>
          )}
            <button onClick={onZoomOut} className="p-1 rounded hover:bg-dark-hover text-light/40 hover:text-light transition-colors cursor-pointer" title="Zoom uit">
              <ZoomOut size={14} />
            </button>
            <button onClick={onResetZoom} className="px-1.5 py-0.5 rounded hover:bg-dark-hover text-light/40 hover:text-light transition-colors text-[10px] cursor-pointer tabular-nums" title="Reset zoom">
              {Math.round(scale * 100)}%
            </button>
            <button onClick={onZoomIn} className="p-1 rounded hover:bg-dark-hover text-light/40 hover:text-light transition-colors cursor-pointer" title="Zoom in">
              <ZoomIn size={14} />
            </button>
        </div>
      </div>
    </>
  );
}
