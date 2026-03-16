import { useCallback, useEffect, useMemo, useState } from 'react';
import { Floor, RoomTask, calcTotalWalls } from '../types';
import KamerSelector from '../components/KamerSelector';

const TASK_DEFINITIONS: { category: RoomTask['category']; label: string; tasks: { name: string; details?: string[] }[] }[] = [
  {
    category: 'wanden',
    label: 'Wanden',
    tasks: [
      { name: 'Stucen', details: ['Glad stuc', 'Spachtelputz', 'Sierpleister'] },
      { name: 'Schilderen', details: ['Muurverf', 'Lakverf', 'Krijtverf'] },
      { name: 'Betegelen', details: ['Wandtegels', 'Mozaïek', 'Natuursteen'] },
      { name: 'Behangen', details: ['Vliesbehang', 'Papierbehang', 'Glasvezelbehang'] },
      { name: 'Isoleren', details: ['Glaswol', 'Styropor', 'PIR-platen'] },
    ],
  },
  {
    category: 'plafond',
    label: 'Plafond',
    tasks: [
      { name: 'Stucen', details: ['Glad stuc', 'Spachtelputz'] },
      { name: 'Schilderen', details: ['Muurverf', 'Lakverf', 'Krijtverf'] },
      { name: 'Systeemplafond', details: ['600×600 tegels', '1200×600 tegels', 'Metal'] },
      { name: 'Behang', details: ['Vliesbehang', 'Glasvezelbehang'] },
    ],
  },
  {
    category: 'vloer',
    label: 'Vloer',
    tasks: [
      { name: 'Tegels', details: ['Keramisch', 'Natuursteen', 'Grootformaat'] },
      { name: 'Laminaat', details: ['Standaard', 'Waterbestendig', 'Premium'] },
      { name: 'Beton storten', details: ['Gepolijst', 'Geschuurd', 'Gecoat'] },
      { name: 'PVC', details: ['Click PVC', 'Dryback PVC', 'Visgraat PVC'] },
      { name: 'Tapijt', details: ['Bouclé', 'Velours', 'Sisal'] },
    ],
  },
  {
    category: 'overig',
    label: 'Overig',
    tasks: [
      { name: 'Elektra ruwbouw' },
      { name: 'Leidingen trekken' },
      { name: 'Sparingen' },
    ],
  },
];

interface TabWerkzaamhedenProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  activeFloorId: string;
  setActiveFloorId: React.Dispatch<React.SetStateAction<string>>;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;
}

export default function TabWerkzaamheden({
  floors,
  setFloors,
  activeFloorId,
  setActiveFloorId,
  setActiveTab,
}: TabWerkzaamhedenProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const activeFloor = floors.find(f => f.id === activeFloorId);
  const rooms = useMemo(() => activeFloor?.rooms ?? [], [activeFloor]);
  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null;

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) setSelectedRoomId(rooms[0].id);
    if (selectedRoomId && !rooms.find(r => r.id === selectedRoomId) && rooms.length > 0) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  const updateRoomTasks = useCallback(
    (roomId: string, updater: (tasks: RoomTask[]) => RoomTask[]) => {
      setFloors(prev =>
        prev.map(f => ({
          ...f,
          rooms: f.rooms.map(r =>
            r.id === roomId ? { ...r, tasks: updater(r.tasks ?? []) } : r,
          ),
        })),
      );
    },
    [setFloors],
  );

  const toggleTask = useCallback(
    (category: RoomTask['category'], name: string) => {
      if (!selectedRoomId) return;
      updateRoomTasks(selectedRoomId, (tasks) => {
        const existing = tasks.find(t => t.category === category && t.name === name);
        if (existing) {
          return existing.checked
            ? tasks.filter(t => t.id !== existing.id)
            : tasks.map(t => (t.id === existing.id ? { ...t, checked: true } : t));
        }
        return [...tasks, { id: crypto.randomUUID(), category, name, checked: true }];
      });
    },
    [selectedRoomId, updateRoomTasks],
  );

  const setTaskDetail = useCallback(
    (taskId: string, detail: string) => {
      if (!selectedRoomId) return;
      updateRoomTasks(selectedRoomId, tasks =>
        tasks.map(t => (t.id === taskId ? { ...t, detail } : t)),
      );
    },
    [selectedRoomId, updateRoomTasks],
  );

  const isChecked = (category: RoomTask['category'], name: string) => {
    const tasks = selectedRoom?.tasks ?? [];
    return tasks.some(t => t.category === category && t.name === name && t.checked);
  };

  const getTask = (category: RoomTask['category'], name: string) => {
    const tasks = selectedRoom?.tasks ?? [];
    return tasks.find(t => t.category === category && t.name === name && t.checked);
  };

  const allRooms = floors.flatMap(f => f.rooms);
  const allTasks = allRooms.flatMap(r => r.tasks ?? []).filter(t => t.checked);

  const taskTotals = TASK_DEFINITIONS.flatMap(cat =>
    cat.tasks.map(t => ({
      category: cat.label,
      name: t.name,
      count: allTasks.filter(at => at.category === cat.category && at.name === t.name).length,
      totalM2: allRooms
        .filter(r => (r.tasks ?? []).some(rt => rt.category === cat.category && rt.name === t.name && rt.checked))
        .reduce((sum, r) => {
          if (cat.category === 'wanden') return sum + calcTotalWalls(r);
          if (cat.category === 'plafond' || cat.category === 'vloer') return sum + r.length * r.width;
          return sum + r.length * r.width;
        }, 0),
    })),
  ).filter(t => t.count > 0);

  return (
    <div className="flex h-full">
      <div className="w-[250px] shrink-0 border-r border-dark-border">
        <KamerSelector
          floors={floors}
          activeFloorId={activeFloorId}
          onFloorChange={(id) => { setActiveFloorId(id); setSelectedRoomId(null); }}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          emptyAction={() => setActiveTab(1)}
          emptyLabel="← Naar Plattegrond"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {!selectedRoom ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-light/40">Selecteer een kamer om werkzaamheden in te stellen</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <h2 className="text-sm font-semibold text-light">
              Werkzaamheden — {selectedRoom.name}
            </h2>

            {TASK_DEFINITIONS.map((cat) => (
              <div key={cat.category}>
                <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
                  {cat.label}
                </h3>
                <div className="space-y-1.5">
                  {cat.tasks.map((task) => {
                    const checked = isChecked(cat.category, task.name);
                    const taskObj = getTask(cat.category, task.name);
                    return (
                      <div key={task.name} className="rounded-lg bg-dark-card border border-dark-border p-2.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTask(cat.category, task.name)}
                            className="accent-accent w-3.5 h-3.5"
                          />
                          <span className="text-sm text-light/70">{task.name}</span>
                        </label>
                        {checked && task.details && taskObj && (
                          <div className="mt-2 ml-6">
                            <select
                              value={taskObj.detail ?? ''}
                              onChange={(e) => setTaskDetail(taskObj.id, e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-dark border border-dark-border text-light text-xs focus:outline-none focus:border-accent"
                            >
                              <option value="">Kies materiaal...</option>
                              {task.details.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {taskTotals.length > 0 && (
              <div className="border-t border-dark-border pt-4">
                <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
                  Totalen over alle kamers
                </h3>
                <div className="space-y-1">
                  {taskTotals.map((t) => (
                    <div key={`${t.category}-${t.name}`} className="flex items-center justify-between text-xs">
                      <span className="text-light/60">{t.category} — {t.name}</span>
                      <span className="text-light/40">{t.count} kamer{t.count !== 1 ? 's' : ''} · {t.totalM2.toFixed(1)} m²</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="shrink-0 flex items-center justify-between p-4 border-t border-dark-border bg-dark">
          <button
            onClick={() => setActiveTab(2)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-card border border-dark-border text-light/60 hover:text-light transition-colors cursor-pointer"
          >
            ← Elementen
          </button>
          <button
            onClick={() => setActiveTab(4)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer"
          >
            Preview →
          </button>
        </div>
      </div>
    </div>
  );
}
