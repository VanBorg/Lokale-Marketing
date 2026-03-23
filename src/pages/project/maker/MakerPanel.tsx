import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { Room, SubRoom } from '../../../lib/database.types';
import SlideShape from './SlideShape';
import SlideDimensions from './SlideDimensions';
import SlideSubRooms from './SlideSubRooms';
import SlideReview from './SlideReview';

interface MakerPanelProps {
  onAddRoom: (room: Omit<Room, 'id' | 'project_id' | 'created_at'>) => void;
}

const STEP_LABELS = ['Vorm', 'Afmetingen', 'Sub-ruimtes', 'Review'];

export default function MakerPanel({ onAddRoom }: MakerPanelProps) {
  const [step, setStep] = useState(0);
  const [shape, setShape] = useState('rechthoek');
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(3);
  const [subRooms, setSubRooms] = useState<SubRoom[]>([]);
  const [name, setName] = useState('');

  const reset = () => {
    setStep(0);
    setShape('rechthoek');
    setWidth(4);
    setHeight(3);
    setSubRooms([]);
    setName('');
  };

  const handleFinish = () => {
    onAddRoom({
      name,
      shape,
      width,
      height,
      position_x: 40 + Math.random() * 60,
      position_y: 40 + Math.random() * 60,
      sub_rooms: subRooms,
      area_m2: width * height,
    });
    reset();
  };

  return (
    <div className="w-80 shrink-0 border-l border-dark-border bg-dark-card flex flex-col">
      {/* Stepper */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-dark-border">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium transition-colors ${
                i === step
                  ? 'bg-accent text-white'
                  : i < step
                    ? 'bg-accent/20 text-accent'
                    : 'bg-dark-hover text-light/30'
              }`}
            >
              {i + 1}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-4 h-px ${i < step ? 'bg-accent/40' : 'bg-dark-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === 0 && <SlideShape selected={shape} onSelect={setShape} />}
        {step === 1 && (
          <SlideDimensions
            width={width}
            height={height}
            onChangeWidth={setWidth}
            onChangeHeight={setHeight}
          />
        )}
        {step === 2 && (
          <SlideSubRooms
            subRooms={subRooms}
            onAdd={sub => setSubRooms(prev => [...prev, sub])}
            onRemove={i => setSubRooms(prev => prev.filter((_, idx) => idx !== i))}
            roomWidth={width}
            roomHeight={height}
          />
        )}
        {step === 3 && (
          <SlideReview
            shape={shape}
            width={width}
            height={height}
            subRooms={subRooms}
            name={name}
            onChangeName={setName}
            onFinish={handleFinish}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border">
        <Button
          variant="ghost"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep(s => s - 1)}
        >
          <ChevronLeft size={14} className="mr-1" /> Vorige
        </Button>
        {step < 3 && (
          <Button size="sm" onClick={() => setStep(s => s + 1)}>
            Volgende <ChevronRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
