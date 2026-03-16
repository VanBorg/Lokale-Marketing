import { X } from 'lucide-react';
import { Floor } from '../types';

interface EtageTabBarProps {
  floors: Floor[];
  activeFloorId: string;
  onFloorChange: (floorId: string) => void;
  onAddFloor?: () => void;
  onDeleteFloor?: (floorId: string) => void;
}

export default function EtageTabBar({
  floors,
  activeFloorId,
  onFloorChange,
  onAddFloor,
  onDeleteFloor,
}: EtageTabBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-dark-border bg-dark shrink-0">
      {floors.map(f => (
        <button
          key={f.id}
          onClick={() => onFloorChange(f.id)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer
            ${f.id === activeFloorId
              ? 'text-accent border-b-2 border-accent'
              : 'text-light/50 hover:text-light/80'
            }`}
        >
          {f.name}
          {f.id !== '1' && onDeleteFloor && (
            <span
              onClick={(e) => { e.stopPropagation(); onDeleteFloor(f.id); }}
              className="ml-1 p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </span>
          )}
        </button>
      ))}
      {onAddFloor && (
        <button
          onClick={onAddFloor}
          className="px-3 py-1.5 text-xs text-light/40 hover:text-accent transition-colors cursor-pointer"
        >
          + Etage toevoegen
        </button>
      )}
    </div>
  );
}
