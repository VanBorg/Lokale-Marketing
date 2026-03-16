import { SHAPES, SPECIAL_ROOMS, Room, RoomType } from './types';

const shapeIcons: Record<string, React.ReactNode> = {
  rechthoek: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <rect x="3" y="5" width="18" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  langwerpig: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <rect x="2" y="8" width="20" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'l-vorm': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M3 3 H12 V12 H21 V21 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  boog: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M12 3 H21 V21 H12 V12 H3 V3 H12 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  't-vorm': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M3 3 H21 V10 H15 V21 H9 V10 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'u-vorm': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M3 3 H9 V14 H15 V3 H21 V21 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  trapezium: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M6 5 H18 L21 19 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'plus-vorm': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M9 3 H15 V9 H21 V15 H15 V21 H9 V15 H3 V9 H9 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'i-vorm': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M4 5 H20 V9 H15 V15 H20 V19 H4 V15 H9 V9 H4 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const ROTATIONS = [0, 90, 180, 270] as const;

interface RoomShapesProps {
  selectedShape: string | null;
  onSelect: (shape: string) => void;
  onAddSpecialRoom?: (type: RoomType, name: string, length: number, width: number) => void;
  selectedRoom: Room | null;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
}

export default function RoomShapes({
  selectedShape,
  onSelect,
  onAddSpecialRoom,
  selectedRoom,
  onUpdateRoom,
}: RoomShapesProps) {
  return (
    <div className="p-4 border-b border-dark-border">
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-3">
        Kamervorm
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            onClick={() => onSelect(shape.id)}
            title={shape.label}
            className={`
              flex items-center justify-center p-1.5 rounded-lg
              border transition-colors duration-150 cursor-pointer
              ${
                selectedShape === shape.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark-card text-light/60 hover:border-light/30 hover:text-light'
              }
            `}
          >
            {shapeIcons[shape.id]}
          </button>
        ))}
      </div>

      {onAddSpecialRoom && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
            Speciale ruimtes
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {SPECIAL_ROOMS.map(sr => (
              <button
                key={sr.type}
                onClick={() => onAddSpecialRoom(sr.type, sr.label, sr.length, sr.width)}
                className="px-2 py-1.5 rounded-lg text-xs font-medium bg-dark-card border border-dark-border text-blue-400 hover:border-blue-400/40 hover:bg-blue-400/5 transition-colors cursor-pointer"
              >
                + {sr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedRoom && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
            Roteer kamer
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {ROTATIONS.map((deg) => (
              <button
                key={deg}
                onClick={() => onUpdateRoom(selectedRoom.id, { rotation: deg })}
                className={`
                  px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                  ${
                    selectedRoom.rotation === deg
                      ? 'bg-accent text-white'
                      : 'bg-dark-card border border-dark-border text-light/60 hover:border-light/30 hover:text-light'
                  }
                `}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
