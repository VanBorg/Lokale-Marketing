import { useRoom } from '../../../store/blueprintStore'
import { formatCmAsMeters, polygonArea, getPerimeter } from '../../../utils/blueprintGeometry'

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
    <div className="flex items-baseline justify-between gap-2 border-b border-dark-border py-1.5 last:border-0 theme-light:border-neutral-200">
      <span className="text-xs text-neutral-500 theme-light:text-neutral-600">{label}</span>
      <span className="text-right text-xs font-medium text-neutral-200 theme-light:text-neutral-900">{value}</span>
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
  geen: 'Geen (bijv. verdieping erboven)',
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
        <p className="py-4 text-center text-xs text-neutral-500 theme-light:text-neutral-600">
          Nog geen kamer aangemaakt. Ga terug naar stap 1.
        </p>
        <button
          type="button"
          onClick={onPrev}
          className="w-full px-4 py-2 text-xs text-neutral-400 transition-colors duration-200 hover:text-neutral-200 theme-light:text-neutral-600 theme-light:hover:text-neutral-900"
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 theme-light:text-neutral-600">
        Overzicht kamer
      </p>

      {/* Summary table */}
      <div className="rounded-lg border border-dark-border px-3 py-1 theme-light:border-neutral-200">
        <SummaryRow label="Naam" value={room.name} />
        <SummaryRow label="Vorm" value={shapeName} />
        <SummaryRow label="Vloeroppervlak" value={`${floorM2.toFixed(2)} m²`} />
        <SummaryRow label="Totaal wandoppervlak" value={`${wallM2.toFixed(2)} m²`} />
        <SummaryRow label="Plafondoppervlak" value={`${floorM2.toFixed(2)} m²`} />
        <SummaryRow label="Wandhoogte" value={formatCmAsMeters(room.wallHeight)} />
        <SummaryRow label="Daktype" value={roofName} />
        <SummaryRow label="Aantal wanden" value={`${room.vertices.length}`} />
        <SummaryRow label="Aantal etages" value="1" />
      </div>

      {/* Ready for quote block */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-3 space-y-1">
        <p className="text-xs font-semibold text-accent">Klaar voor offerte</p>
        <p className="text-xs leading-relaxed text-neutral-400 theme-light:text-neutral-700">
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
          className="w-full px-4 py-2 text-xs text-neutral-400 transition-colors duration-200 hover:text-neutral-200 theme-light:text-neutral-600 theme-light:hover:text-neutral-900"
        >
          ← Vorige
        </button>
      </div>
    </div>
  )
}
