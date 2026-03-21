import { SHAPES, Room, RoomType, isSpecialRoom } from './types';
import { SPECIAL_ROOM_CONFIGS } from './specialRooms';
import { RoomRotationPicker, SpecialRoomOrientationPicker } from './RoomEditPanel';
import RotationDial from './canvas/RotationDial';
import { Hammer } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

/* ── Shape icons ──────────────────────────────────────────────── */

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
  'z-vorm': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M3 3 H12 V10 H21 V21 H12 V14 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'z-vorm-inv': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M12 3 H21 V14 H12 V21 H3 V10 H12 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  's-vorm': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M3 8 H12 V3 H21 V16 H12 V21 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  's-vorm-inv': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M3 3 H12 V8 H21 V21 H12 V16 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  vijfhoek: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M12 3 L21 10 L18 21 H6 L3 10 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'halve-cirkel': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M3 19 A9 9 0 0 1 21 19 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

/* ── RoomShapes (main) ────────────────────────────────────────── */

interface RoomShapesProps {
  selectedShape: string | null;
  onSelect: (shape: string) => void;
  onSelectFreeForm?: () => void;
  selectedRoom: Room | null;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
}

export default function RoomShapes({
  selectedShape,
  onSelect,
  onSelectFreeForm,
  selectedRoom,
  onUpdateRoom,
}: RoomShapesProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="p-4 border-b border-dark-border">
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-3">
        Kamervorm
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {SHAPES.map(shape => {
          const isFreeForm = shape.id === 'vrije-vorm';
          const isSelected = selectedShape === shape.id;

          if (isFreeForm) {
            return (
              <button
                key={shape.id}
                onClick={() => onSelectFreeForm ? onSelectFreeForm() : onSelect(shape.id)}
                title={shape.label}
                className={`
                  relative flex items-center justify-center p-1.5 rounded-lg
                  transition-all duration-150 cursor-pointer
                  ${isSelected
                    ? 'border-2 border-accent bg-accent/10 text-accent'
                    : 'border-2 bg-dark-card hover:border-accent/50 hover:text-accent/80'
                  }
                `}
                style={{
                  borderColor: isSelected
                    ? undefined
                    : isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)',
                  color: isSelected
                    ? undefined
                    : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-md"
                  style={{
                    width: 24,
                    height: 24,
                    background: isSelected
                      ? 'rgba(255,92,26,0.15)'
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <Hammer size={15} strokeWidth={2} />
                </div>
              </button>
            );
          }

          return (
            <button
              key={shape.id}
              onClick={() => onSelect(shape.id)}
              title={shape.label}
              className={`
                flex items-center justify-center p-1.5 rounded-lg
                border transition-colors duration-150 cursor-pointer
                ${isSelected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark-card text-light/60 hover:border-light/30 hover:text-light'
                }
              `}
            >
              {shapeIcons[shape.id]}
            </button>
          );
        })}
      </div>

      {/* ── Rotation selector (same control as in RoomEditPanel when a room is open) ── */}
      {selectedRoom && (
        isSpecialRoom(selectedRoom) ? (
          <SpecialRoomOrientationPicker
            room={selectedRoom}
            onUpdateRoom={onUpdateRoom}
            disabled={selectedRoom.isFinalized}
            className="mt-4"
          />
        ) : (
          <RoomRotationPicker
            room={selectedRoom}
            onUpdateRoom={onUpdateRoom}
            disabled={selectedRoom.isFinalized}
            className="mt-4"
          />
        )
      )}
      {selectedRoom && selectedRoom.roomType !== 'normal' && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
            Precieze rotatie
          </h3>
          <RotationDial
            rotation={selectedRoom.rotation || 0}
            onChange={(deg) => onUpdateRoom(selectedRoom.id, { rotation: deg })}
            disabled={selectedRoom.isFinalized}
          />
        </div>
      )}
    </div>
  );
}

/* ── Special Rooms Section ────────────────────────────────────── */

export function SpecialRoomsSection({
  onAddSpecialRoom,
}: {
  onAddSpecialRoom: (type: RoomType, name: string, length: number, width: number) => void;
}) {
  return (
    <div className="p-4 border-b border-dark-border">
      <h3 className="text-xs font-semibold text-light/50 uppercase tracking-wider mb-2">
        Speciale ruimtes
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.values(SPECIAL_ROOM_CONFIGS).map(cfg => (
          <button
            key={cfg.type}
            onClick={() => onAddSpecialRoom(cfg.type as RoomType, cfg.label, cfg.defaultLength, cfg.defaultWidth)}
            title={cfg.description}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-dark-card border border-dark-border text-accent hover:border-accent/40 hover:bg-accent/5 transition-colors cursor-pointer"
          >
            <span>{cfg.icon}</span>
            <span>{cfg.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}