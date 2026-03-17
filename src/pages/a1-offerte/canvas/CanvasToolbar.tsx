import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Undo2, Redo2, Copy, Scissors, ClipboardPaste, CopyPlus, Keyboard } from 'lucide-react';
import { Room } from '../types';

const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], description: 'Ongedaan maken' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Opnieuw' },
  { keys: ['Ctrl', 'Y'], description: 'Opnieuw' },
  { keys: ['S'], description: 'Centreer canvas' },
  { keys: ['Esc'], description: 'Plaatsing annuleren' },
  { keys: ['Delete'], description: 'Kamer verwijderen' },
  { keys: ['Ctrl', 'Klik'], description: 'Multi-selectie' },
  { keys: ['Shift', 'Klik'], description: 'Reeks selecteren' },
  { keys: ['Ctrl', 'Sleep'], description: 'Marquee selectie' },
  { keys: ['Scroll'], description: 'Zoom in/uit' },
  { keys: ['W'], description: 'Wizard: ruimte opvullen' },
];

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

function ShortcutsButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Sneltoetsen"
        className="p-1.5 rounded text-light/40 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer"
      >
        <Keyboard size={15} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-dark-card border border-dark-border shadow-xl p-3 z-50">
          <p className="text-xs font-semibold text-light mb-2">Sneltoetsen</p>
          <div className="flex flex-col gap-1.5">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-light/50">{s.description}</span>
                <span className="flex items-center gap-0.5">
                  {s.keys.map((k, j) => (
                    <kbd
                      key={j}
                      className="min-w-[22px] px-1.5 py-0.5 rounded bg-dark-hover border border-dark-border text-light/70 text-center text-[10px] font-mono leading-tight"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
          <ShortcutsButton />
          <div className="w-px h-4 bg-dark-border mx-1" />
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
