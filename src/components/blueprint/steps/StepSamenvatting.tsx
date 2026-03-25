import { useRoom } from '../../../store/blueprintStore'
import { polygonArea, getPerimeter } from '../../../utils/blueprintGeometry'

interface StepSamenvattingProps {
  roomId: string | null
  onFinalize: () => void
  onPrev: () => void
}

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-1.5 border-b border-dark-border last:border-0">
      <span className="text-xs text-light/50">{label}</span>
      <span className="text-xs text-light/80 font-medium text-right">{value}</span>
    </div>
  )
}

const SHAPE_LABELS: Record<string, string> = {
  rechthoek: 'Rechthoek',
  l_vorm: 'L-vorm',
  t_vorm: 'T-vorm',
  u_vorm: 'U-vorm',
  vrij: 'Vrije vorm',
}

const ROOF_LABELS: Record<string, string> = {
  plat: 'Plat dak',
  'schuin-enkel': 'Schuin dak',
  zadeldak: 'Zadeldak',
  schilddak: 'Schilddak',
  mansardedak: 'Mansardedak',
  platband: 'Platband',
}

export default function StepSamenvatting({ roomId, onFinalize, onPrev }: StepSamenvattingProps) {
  const room = useRoom(roomId ?? '')

  if (!room) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-light/40 text-center py-4">Nog geen kamer aangemaakt. Ga terug naar stap 1.</p>
        <button
          type="button"
          onClick={onPrev}
          className="w-full px-4 py-2 text-xs text-light/50 hover:text-light transition-colors duration-200"
        >
          ← Vorige
        </button>
      </div>
    )
  }

  const floorM2 = polygonArea(room.vertices) / 10000
  const wallM2 = (getPerimeter(room.vertices) * room.wallHeight) / 10000
  const shapeName = room.shape ? (SHAPE_LABELS[room.shape] ?? room.shape) : 'Onbekend'
  const roofName = ROOF_LABELS[room.roofType] ?? room.roofType

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-light/40">Overzicht kamer</p>

      {/* Summary table */}
      <div className="rounded-lg border border-dark-border px-3 py-1">
        <SummaryRow label="Naam" value={room.name} />
        <SummaryRow label="Vorm" value={shapeName} />
        <SummaryRow label="Vloeroppervlak" value={`${floorM2.toFixed(2)} m²`} />
        <SummaryRow label="Totaal wandoppervlak" value={`${wallM2.toFixed(2)} m²`} />
        <SummaryRow label="Plafondoppervlak" value={`${floorM2.toFixed(2)} m²`} />
        <SummaryRow label="Wandhoogte" value={`${room.wallHeight} cm`} />
        <SummaryRow label="Daktype" value={roofName} />
        <SummaryRow label="Aantal wanden" value={`${room.vertices.length}`} />
        <SummaryRow label="Aantal etages" value="1" />
      </div>

      {/* Ready for quote block */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-3 space-y-1">
        <p className="text-xs font-semibold text-accent">Klaar voor offerte</p>
        <p className="text-xs text-light/60 leading-relaxed">
          Deze kamer is volledig ingevuld. Je kunt nu de materiaallijst en offerte genereren vanuit het dashboard.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onFinalize}
          className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors duration-200"
        >
          ✓ Kamer opslaan
        </button>
        <button
          type="button"
          onClick={onPrev}
          className="w-full px-4 py-2 text-xs text-light/50 hover:text-light transition-colors duration-200"
        >
          ← Vorige
        </button>
      </div>
    </div>
  )
}
