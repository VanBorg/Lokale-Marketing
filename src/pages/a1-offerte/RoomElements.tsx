import { Trash2 } from 'lucide-react';
import { Room, RoomElement, ELEMENT_DEFAULTS } from './types';

interface RoomElementsProps {
  room: Room;
  onAddElement: (roomId: string, type: RoomElement['type']) => void;
  onUpdateElement: (roomId: string, elementId: string, updates: Partial<RoomElement>) => void;
  onRemoveElement: (roomId: string, elementId: string) => void;
}

const elementTypes = Object.keys(ELEMENT_DEFAULTS) as RoomElement['type'][];

function parseNum(value: string, fallback: number): number {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

export default function RoomElements({
  room,
  onAddElement,
  onUpdateElement,
  onRemoveElement,
}: RoomElementsProps) {
  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-3">
        Elementen
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {elementTypes.map((type) => (
          <button
            key={type}
            onClick={() => onAddElement(room.id, type)}
            className="px-2 py-1.5 rounded-lg text-xs font-medium
              bg-dark-card border border-dark-border text-light/70
              hover:border-accent/40 hover:text-light transition-colors cursor-pointer"
          >
            + {ELEMENT_DEFAULTS[type].label}
          </button>
        ))}
      </div>

      {room.elements.length > 0 && (
        <div className="space-y-2">
          {room.elements.map((el) => (
            <div
              key={el.id}
              className="rounded-lg bg-dark-card border border-dark-border p-2 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-light/60 w-16 shrink-0 truncate">
                  {ELEMENT_DEFAULTS[el.type].label}
                </span>

                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    value={el.width}
                    onChange={(e) =>
                      onUpdateElement(room.id, el.id, {
                        width: parseNum(e.target.value, el.width),
                      })
                    }
                    className="w-14 px-1.5 py-1 rounded bg-dark border border-dark-border
                      text-light text-xs text-center focus:outline-none focus:border-accent"
                    title="Breedte (m)"
                  />
                  <span className="text-light/30 text-xs">×</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    value={el.height}
                    onChange={(e) =>
                      onUpdateElement(room.id, el.id, {
                        height: parseNum(e.target.value, el.height),
                      })
                    }
                    className="w-14 px-1.5 py-1 rounded bg-dark border border-dark-border
                      text-light text-xs text-center focus:outline-none focus:border-accent"
                    title="Hoogte (m)"
                  />
                </div>

                <button
                  onClick={() => onRemoveElement(room.id, el.id)}
                  className="p-1 rounded text-light/30 hover:text-red-400 hover:bg-red-400/10
                    transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
