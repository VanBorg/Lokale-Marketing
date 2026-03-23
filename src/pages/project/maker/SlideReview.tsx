import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import type { SubRoom } from '../../../lib/database.types';

interface SlideReviewProps {
  shape: string;
  width: number;
  height: number;
  subRooms: SubRoom[];
  name: string;
  onChangeName: (v: string) => void;
  onFinish: () => void;
}

export default function SlideReview({
  shape,
  width,
  height,
  subRooms,
  name,
  onChangeName,
  onFinish,
}: SlideReviewProps) {
  const area = width * height;

  return (
    <div>
      <h3 className="text-sm font-semibold text-light mb-3">Review &amp; toevoegen</h3>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between text-light/60">
          <span>Vorm</span>
          <span className="text-light capitalize">{shape}</span>
        </div>
        <div className="flex justify-between text-light/60">
          <span>Afmetingen</span>
          <span className="text-light">{width.toFixed(2)} x {height.toFixed(2)} m</span>
        </div>
        <div className="flex justify-between text-light/60">
          <span>Oppervlakte</span>
          <span className="text-light">{area.toFixed(1)} m²</span>
        </div>
        <div className="flex justify-between text-light/60">
          <span>Sub-ruimtes</span>
          <span className="text-light">{subRooms.length}</span>
        </div>
      </div>

      <Input
        label="Kamernaam"
        value={name}
        onChange={e => onChangeName(e.target.value)}
        placeholder="bijv. Woonkamer"
      />

      <Button className="w-full mt-4" onClick={onFinish} disabled={!name.trim()}>
        Voeg toe aan plattegrond
      </Button>
    </div>
  );
}
