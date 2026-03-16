import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Undo2, Redo2 } from 'lucide-react';
import { Floor } from './types';
import TabPlattegrond from './tabs/TabPlattegrond';
import TabElementen from './tabs/TabElementen';
import TabWerkzaamheden from './tabs/TabWerkzaamheden';
import TabPreview from './tabs/TabPreview';

const MAX_HISTORY = 50;
type HistorySnapshot = { floors: Floor[]; activeFloorId: string };

function loadSavedFloors(): Floor[] {
  try {
    const saved = localStorage.getItem('craftbase_autosave');
    if (saved) {
      const data = JSON.parse(saved);
      if (Array.isArray(data.floors) && data.floors.length > 0) return data.floors;
    }
  } catch {}
  return [{ id: '1', name: 'Begane grond', rooms: [] }];
}

function loadSavedFloorId(): string {
  try {
    const saved = localStorage.getItem('craftbase_autosave');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.activeFloorId) return data.activeFloorId;
    }
  } catch {}
  return '1';
}

const TABS = [
  { num: 1 as const, label: '1. Plattegrond' },
  { num: 2 as const, label: '2. Elementen' },
  { num: 3 as const, label: '3. Werkzaamheden' },
  { num: 4 as const, label: '4. Preview' },
];

export default function OfferteGenerator() {
  const [floors, setFloorsRaw] = useState<Floor[]>(loadSavedFloors);
  const [activeFloorId, setActiveFloorIdRaw] = useState(loadSavedFloorId);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);
  const [historyVersion, setHistoryVersion] = useState(0);

  const pastRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const isUndoRedoRef = useRef(false);

  const pushToPast = useCallback((snapshot: HistorySnapshot) => {
    pastRef.current = [...pastRef.current.slice(1 - MAX_HISTORY), snapshot];
    futureRef.current = [];
    setHistoryVersion(v => v + 1);
  }, []);

  const setFloors = useCallback(
    (update: React.SetStateAction<Floor[]>) => {
      if (isUndoRedoRef.current) {
        setFloorsRaw(update);
        return;
      }
      setFloorsRaw(prev => {
        const next = typeof update === 'function' ? (update as (prev: Floor[]) => Floor[])(prev) : update;
        if (prev === next) return prev;
        pushToPast({ floors: prev, activeFloorId });
        return next;
      });
    },
    [activeFloorId, pushToPast],
  );

  const setActiveFloorId = useCallback(
    (update: React.SetStateAction<string>) => {
      if (isUndoRedoRef.current) {
        setActiveFloorIdRaw(update);
        return;
      }
      setActiveFloorIdRaw(prev => {
        const next = typeof update === 'function' ? (update as (prev: string) => string)(prev) : update;
        if (prev === next) return prev;
        pushToPast({ floors, activeFloorId: prev });
        return next;
      });
    },
    [floors, pushToPast],
  );

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const snapshot = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [{ floors, activeFloorId }, ...futureRef.current];
    setHistoryVersion(v => v + 1);
    isUndoRedoRef.current = true;
    setFloorsRaw(snapshot.floors);
    setActiveFloorIdRaw(snapshot.activeFloorId);
    isUndoRedoRef.current = false;
  }, [floors, activeFloorId]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const snapshot = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current.slice(1 - MAX_HISTORY), { floors, activeFloorId }];
    setHistoryVersion(v => v + 1);
    isUndoRedoRef.current = true;
    setFloorsRaw(snapshot.floors);
    setActiveFloorIdRaw(snapshot.activeFloorId);
    isUndoRedoRef.current = false;
  }, [floors, activeFloorId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    localStorage.setItem('craftbase_autosave', JSON.stringify({ floors, activeFloorId }));
  }, [floors, activeFloorId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const goTo = useCallback((tab: 1 | 2 | 3 | 4) => setActiveTab(tab), []);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-dark-border bg-dark">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="Ongedaan maken (Ctrl+Z)"
          className="p-1.5 rounded-lg text-light/40 hover:text-light disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Undo2 size={18} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="Opnieuw (Ctrl+Y)"
          className="p-1.5 rounded-lg text-light/40 hover:text-light disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Redo2 size={18} />
        </button>
        <span className="w-px h-5 bg-dark-border mx-0.5" aria-hidden />
        <button
          disabled={activeTab === 1}
          onClick={() => setActiveTab((activeTab - 1) as 1 | 2 | 3 | 4)}
          className="p-1.5 rounded-lg text-light/40 hover:text-light disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>

        {TABS.map(tab => (
          <button
            key={tab.num}
            onClick={() => setActiveTab(tab.num)}
            className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
              activeTab === tab.num
                ? 'text-light border-accent'
                : 'text-light/40 border-transparent hover:text-light/70'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <button
          disabled={activeTab === 4}
          onClick={() => setActiveTab((activeTab + 1) as 1 | 2 | 3 | 4)}
          className="p-1.5 rounded-lg text-light/40 hover:text-light disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-b-xl border border-t-0 border-dark-border">
        {activeTab === 1 && (
          <TabPlattegrond
            floors={floors}
            setFloors={setFloors}
            activeFloorId={activeFloorId}
            setActiveFloorId={setActiveFloorId}
            setActiveTab={goTo}
          />
        )}
        {activeTab === 2 && (
          <TabElementen
            floors={floors}
            setFloors={setFloors}
            activeFloorId={activeFloorId}
            setActiveFloorId={setActiveFloorId}
            setActiveTab={goTo}
          />
        )}
        {activeTab === 3 && (
          <TabWerkzaamheden
            floors={floors}
            setFloors={setFloors}
            activeFloorId={activeFloorId}
            setActiveFloorId={setActiveFloorId}
            setActiveTab={goTo}
          />
        )}
        {activeTab === 4 && (
          <TabPreview
            floors={floors}
            setActiveTab={goTo}
          />
        )}
      </div>
    </div>
  );
}
