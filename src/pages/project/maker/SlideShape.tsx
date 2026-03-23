const shapes = [
  { id: 'rechthoek', label: 'Rechthoek', svg: 'M4 4h40v28H4z' },
  { id: 'l-vorm', label: 'L-vorm', svg: 'M4 4h20v12h20v16H4z' },
  { id: 't-vorm', label: 'T-vorm', svg: 'M4 4h40v12H28v16H20V16H4z' },
  { id: 'u-vorm', label: 'U-vorm', svg: 'M4 4h12v20h16V4h12v32H4z' },
  { id: 'vrij', label: 'Vrije vorm', svg: 'M4 4h40v10l-10 8v10H14V22L4 14z' },
] as const;

interface SlideShapeProps {
  selected: string;
  onSelect: (shape: string) => void;
}

export default function SlideShape({ selected, onSelect }: SlideShapeProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-light mb-3">Kies een kamervorm</h3>
      <div className="grid grid-cols-2 gap-2">
        {shapes.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
              selected === s.id
                ? 'border-accent bg-accent/10'
                : 'border-dark-border bg-dark-card hover:border-accent/40 hover:bg-dark-hover'
            }`}
          >
            <svg viewBox="0 0 48 36" className="w-12 h-9">
              <path
                d={s.svg}
                fill={selected === s.id ? 'rgba(53,180,211,0.2)' : 'rgba(255,255,255,0.06)'}
                stroke={selected === s.id ? '#35B4D3' : '#555'}
                strokeWidth="1.5"
              />
            </svg>
            <span className="text-xs text-light/60">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
