import { FileText } from 'lucide-react';
import { Floor, calcTotalWalls } from '../types';
import Card from '../../../components/ui/Card';

interface TabPreviewProps {
  floors: Floor[];
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;
}

export default function TabPreview({ floors, setActiveTab }: TabPreviewProps) {
  const allRooms = floors.flatMap(f => f.rooms);
  const totalRooms = allRooms.length;
  const totalFloor = allRooms.reduce((sum, r) => sum + r.length * r.width, 0);
  const totalWalls = allRooms.reduce((sum, r) => sum + calcTotalWalls(r), 0);
  const totalTasks = allRooms.reduce((sum, r) => sum + (r.tasks ?? []).filter(t => t.checked).length, 0);

  const stats = [
    { label: 'Totaal kamers', value: String(totalRooms) },
    { label: 'Totaal m² vloer', value: `${totalFloor.toFixed(1)} m²` },
    { label: 'Totaal m² wanden', value: `${totalWalls.toFixed(1)} m²` },
    { label: 'Aantal werkzaamheden', value: String(totalTasks) },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label}>
              <p className="text-xs text-light/40 mb-1">{s.label}</p>
              <p className="text-lg font-semibold text-light">{s.value}</p>
            </Card>
          ))}
        </div>

        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-xl bg-accent/10 text-accent mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-sm font-semibold text-light mb-1">PDF preview</h3>
            <p className="text-xs text-light/40">
              PDF preview wordt hier geladen — @react-pdf/renderer integratie volgt
            </p>
          </div>
        </Card>
      </div>

      <div className="shrink-0 flex items-center p-4 border-t border-dark-border bg-dark">
        <button
          onClick={() => setActiveTab(3)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-card border border-dark-border text-light/60 hover:text-light transition-colors cursor-pointer"
        >
          ← Werkzaamheden
        </button>
      </div>
    </div>
  );
}
