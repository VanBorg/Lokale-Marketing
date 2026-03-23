import { useState } from 'react';
import type { SubRoom } from '../../../lib/database.types';

const SUB_ROOM_TEMPLATES: { type: string; label: string; w: number; h: number }[] = [
  { type: 'wc', label: 'WC', w: 1, h: 1 },
  { type: 'badkamer', label: 'Badkamer', w: 2, h: 1.5 },
  { type: 'kast', label: 'Kast', w: 0.8, h: 0.6 },
  { type: 'raam', label: 'Raam', w: 1.2, h: 0.15 },
  { type: 'deur', label: 'Deur', w: 0.9, h: 0.15 },
];

interface SlideSubRoomsProps {
  subRooms: SubRoom[];
  onAdd: (sub: SubRoom) => void;
  onRemove: (index: number) => void;
  roomWidth: number;
  roomHeight: number;
}

export default function SlideSubRooms({
  subRooms,
  onAdd,
  onRemove,
  roomWidth,
  roomHeight,
}: SlideSubRoomsProps) {
  const [dragType, setDragType] = useState<string | null>(null);
  const SCALE = 50;
  const pxW = roomWidth * SCALE;
  const pxH = roomHeight * SCALE;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragType) return;
    const template = SUB_ROOM_TEMPLATES.find(t => t.type === dragType);
    if (!template) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, (e.clientX - rect.left) / SCALE);
    const y = Math.max(0, (e.clientY - rect.top) / SCALE);

    onAdd({
      type: template.type,
      label: template.label,
      x: Math.min(x, roomWidth - template.w),
      y: Math.min(y, roomHeight - template.h),
      width: template.w,
      height: template.h,
    });
    setDragType(null);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-light mb-3">Sub-ruimtes toevoegen</h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUB_ROOM_TEMPLATES.map(t => (
          <div
            key={t.type}
            draggable
            onDragStart={() => setDragType(t.type)}
            className="px-3 py-1.5 rounded-lg bg-dark-card border border-dark-border text-xs text-light/60 cursor-grab hover:border-accent/40 hover:text-light transition-all duration-200"
          >
            {t.label}
          </div>
        ))}
      </div>

      <div
        className="relative rounded-lg border-2 border-dashed border-dark-border bg-dark mx-auto"
        style={{ width: pxW, height: pxH, maxWidth: '100%' }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {subRooms.map((sub, i) => (
          <div
            key={i}
            className="absolute border border-accent/30 bg-accent/10 rounded text-[10px] text-accent flex items-center justify-center cursor-pointer hover:bg-accent/20 transition-colors"
            style={{
              left: sub.x * SCALE,
              top: sub.y * SCALE,
              width: sub.width * SCALE,
              height: sub.height * SCALE,
            }}
            onClick={() => onRemove(i)}
            title="Klik om te verwijderen"
          >
            {sub.label}
          </div>
        ))}
        {subRooms.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-light/30">
            Sleep elementen hierin
          </p>
        )}
      </div>
    </div>
  );
}
