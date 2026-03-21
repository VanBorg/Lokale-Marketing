import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, FilePlus2 } from 'lucide-react';
import type { Floor, Room } from './types';

const TabPlattegrond = lazy(() => import('./tabs/TabPlattegrond'));
const TabElementen = lazy(() => import('./tabs/TabElementen'));
const TabWerkzaamheden = lazy(() => import('./tabs/TabWerkzaamheden'));
const TabPreview = lazy(() => import('./tabs/TabPreview'));

function TabPanelFallback() {
  return (
    <div className="flex-1 min-h-[200px] flex items-center justify-center">
      <div
        className="h-8 w-8 rounded-full border-2 border-dark-border border-t-accent animate-spin"
        aria-label="Laden"
      />
    </div>
  );
}

const MAX_HISTORY = 50;
type HistorySnapshot = { floors: Floor[]; activeFloorId: string };

/** One empty floor — use this instead of any removed `EMPTY_FLOORS` constant. */
function createStarterFloors(): Floor[] {
  const rooms: Room[] = [];
  return [{ id: '1', name: 'Begane grond', rooms }];
}

function loadSavedFloors(): Floor[] {
  try {
    const saved = localStorage.getItem('craftbase_autosave');
    if (saved) {
      const data = JSON.parse(saved);
      if (Array.isArray(data.floors) && data.floors.length > 0) return data.floors;
    }
  } catch {}
  return createStarterFloors();
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

function loadSavedProjectName(): string {
  try {
    const saved = localStorage.getItem('craftbase_autosave');
    if (saved) {
      const data = JSON.parse(saved);
      if (typeof data.projectName === 'string') return data.projectName;
    }
  } catch {}
  return '';
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
  const [projectName, setProjectName] = useState(loadSavedProjectName);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);
  const [historyVersion, setHistoryVersion] = useState(0);

  const pastRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const isUndoRedoRef = useRef(false);
  /** Skips history for follow-up setFloors from effects right after undo/redo (e.g. TabPlattegrond parent/child sync). */
  const suppressHistoryRef = useRef(0);
  const batchRef = useRef<HistorySnapshot | null>(null);

  const pushToPast = useCallback((snapshot: HistorySnapshot) => {
    pastRef.current = [...pastRef.current.slice(1 - MAX_HISTORY), snapshot];
    futureRef.current = [];
    setHistoryVersion(v => v + 1);
  }, []);

  const beginBatch = useCallback(() => {
    if (!batchRef.current) {
      batchRef.current = { floors, activeFloorId };
    }
  }, [floors, activeFloorId]);

  const endBatch = useCallback(() => {
    if (batchRef.current) {
      pushToPast(batchRef.current);
      batchRef.current = null;
    }
  }, [pushToPast]);

  const setFloors = useCallback(
    (update: React.SetStateAction<Floor[]>) => {
      if (isUndoRedoRef.current || batchRef.current || suppressHistoryRef.current > 0) {
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

  /** Derived room fixes (no extra undo step). */
  const patchActiveFloorRoomsSilent = useCallback(
    (updater: (rooms: Room[]) => Room[]) => {
      setFloorsRaw(prev => {
        const floor = prev.find(f => f.id === activeFloorId);
        if (!floor) return prev;
        const nextRooms = updater(floor.rooms);
        if (nextRooms === floor.rooms) return prev;
        return prev.map(f => (f.id === activeFloorId ? { ...f, rooms: nextRooms } : f));
      });
    },
    [activeFloorId],
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
    suppressHistoryRef.current += 1;
    const snapshot = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [{ floors, activeFloorId }, ...futureRef.current];
    setHistoryVersion(v => v + 1);
    isUndoRedoRef.current = true;
    setFloorsRaw(snapshot.floors);
    setActiveFloorIdRaw(snapshot.activeFloorId);
    isUndoRedoRef.current = false;
    setTimeout(() => {
      suppressHistoryRef.current = Math.max(0, suppressHistoryRef.current - 1);
    }, 0);
  }, [floors, activeFloorId]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    suppressHistoryRef.current += 1;
    const snapshot = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current.slice(1 - MAX_HISTORY), { floors, activeFloorId }];
    setHistoryVersion(v => v + 1);
    isUndoRedoRef.current = true;
    setFloorsRaw(snapshot.floors);
    setActiveFloorIdRaw(snapshot.activeFloorId);
    isUndoRedoRef.current = false;
    setTimeout(() => {
      suppressHistoryRef.current = Math.max(0, suppressHistoryRef.current - 1);
    }, 0);
  }, [floors, activeFloorId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (k === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if (k === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    localStorage.setItem('craftbase_autosave', JSON.stringify({ floors, activeFloorId, projectName }));
  }, [floors, activeFloorId, projectName]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const goTo = useCallback((tab: 1 | 2 | 3 | 4) => setActiveTab(tab), []);

  const startNewProject = useCallback(() => {
    const ok = window.confirm(
      'Weet je zeker dat je een nieuw project wilt starten? Alle huidige plattegronden, elementen en werkzaamheden worden gewist.',
    );
    if (!ok) return;
    pastRef.current = [];
    futureRef.current = [];
    batchRef.current = null;
    suppressHistoryRef.current = 0;
    setHistoryVersion(v => v + 1);
    isUndoRedoRef.current = true;
    setFloorsRaw(createStarterFloors());
    setActiveFloorIdRaw('1');
    isUndoRedoRef.current = false;
    setProjectName('');
    setActiveTab(1);
  }, []);

  const tabContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tabContentRef.current;
    if (!el) return;
    const scrollToCenter = () => {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
      el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
    };
    const id = requestAnimationFrame(scrollToCenter);
    return () => cancelAnimationFrame(id);
  }, [activeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-dark-border bg-dark">
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

        <div className="flex-1 min-w-0" aria-hidden />

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={startNewProject}
            title="Alles wissen en opnieuw beginnen"
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium text-light/80 bg-dark-card border border-dark-border hover:bg-dark-border hover:text-light transition-colors cursor-pointer"
          >
            <FilePlus2 size={16} className="opacity-80" aria-hidden />
            Nieuw project
          </button>
          <label className="text-xs font-medium text-light/50 whitespace-nowrap">Projectnaam</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Naam van het project..."
            className="w-48 max-w-[200px] px-2.5 py-1 rounded-lg bg-dark-card border border-dark-border text-light text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50"
          />
        </div>
      </div>

      <div
        ref={tabContentRef}
        className="flex-1 min-h-0 overflow-auto rounded-b-xl border border-t-0 border-dark-border flex flex-col items-center"
      >
        <div className="w-full max-w-[1800px] flex-1 flex flex-col min-h-0 min-w-0">
          <Suspense fallback={<TabPanelFallback />}>
            {activeTab === 1 && (
              <TabPlattegrond
                floors={floors}
                setFloors={setFloors}
                patchActiveFloorRoomsSilent={patchActiveFloorRoomsSilent}
                activeFloorId={activeFloorId}
                setActiveFloorId={setActiveFloorId}
                setActiveTab={goTo}
                beginBatch={beginBatch}
                endBatch={endBatch}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
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
          </Suspense>
        </div>
      </div>
    </div>
  );
}
