import Input from '../../../components/ui/Input';

interface SlideDimensionsProps {
  width: number;
  height: number;
  onChangeWidth: (v: number) => void;
  onChangeHeight: (v: number) => void;
}

export default function SlideDimensions({
  width,
  height,
  onChangeWidth,
  onChangeHeight,
}: SlideDimensionsProps) {
  const area = width * height;
  const SCALE = 6;
  const pxW = Math.min(width * SCALE * 10, 260);
  const pxH = Math.min(height * SCALE * 10, 180);

  return (
    <div>
      <h3 className="text-sm font-semibold text-light mb-3">Afmetingen</h3>

      <div className="flex gap-3 mb-4">
        <Input
          label="Breedte (m)"
          type="number"
          step="0.01"
          min="0.5"
          value={width}
          onChange={e => onChangeWidth(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
        />
        <Input
          label="Hoogte (m)"
          type="number"
          step="0.01"
          min="0.5"
          value={height}
          onChange={e => onChangeHeight(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
        />
      </div>

      {/* Live preview */}
      <div className="relative flex items-center justify-center p-4 rounded-lg border border-dark-border bg-dark min-h-[200px]">
        <div
          className="relative border-2 border-accent/60 rounded"
          style={{ width: pxW, height: pxH }}
        >
          {/* Width dimension */}
          <div className="absolute -bottom-5 left-0 right-0 flex items-center justify-center">
            <div className="h-px flex-1 bg-light/20" />
            <span className="px-1.5 text-[10px] text-light/50 font-mono">{width.toFixed(2)} m</span>
            <div className="h-px flex-1 bg-light/20" />
          </div>

          {/* Height dimension */}
          <div className="absolute -right-12 top-0 bottom-0 flex flex-col items-center justify-center">
            <div className="w-px flex-1 bg-light/20" />
            <span className="py-0.5 text-[10px] text-light/50 font-mono whitespace-nowrap rotate-90">
              {height.toFixed(2)} m
            </span>
            <div className="w-px flex-1 bg-light/20" />
          </div>

          {/* Area label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-light/40 font-mono">{area.toFixed(1)} m²</span>
          </div>
        </div>
      </div>
    </div>
  );
}
