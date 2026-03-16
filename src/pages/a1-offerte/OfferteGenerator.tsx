import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Floor } from './types';
import TabPlattegrond from './tabs/TabPlattegrond';
import TabElementen from './tabs/TabElementen';
import TabWerkzaamheden from './tabs/TabWerkzaamheden';
import TabPreview from './tabs/TabPreview';

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
  const [floors, setFloors] = useState<Floor[]>(loadSavedFloors);
  const [activeFloorId, setActiveFloorId] = useState(loadSavedFloorId);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);

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
                ? 'text-white border-accent'
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
