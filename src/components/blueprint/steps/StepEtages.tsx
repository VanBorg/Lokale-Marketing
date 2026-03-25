import { useRoomDetailsStore } from '../../../store/roomDetailsStore'
import { nanoid } from 'nanoid'

type EtageType = 'begane grond' | 'verdieping' | 'zolder' | 'kelder' | 'dak'

const ETAGE_TYPE_OPTIONS: { value: EtageType; label: string }[] = [
  { value: 'begane grond', label: 'Begane grond' },
  { value: 'verdieping', label: 'Verdieping' },
  { value: 'zolder', label: 'Zolder' },
  { value: 'kelder', label: 'Kelder' },
  { value: 'dak', label: 'Dak' },
]

const DAKBEDEKKING_OPTIONS = [
  'Dakpannen',
  'Bitumen',
  'EPDM',
  'Sedum/groen dak',
  'Zink',
  'Overig',
]

interface Etage {
  id: string
  naam: string
  type: EtageType
  omschrijving: string
}

interface StepEtagesProps {
  onNext: () => void
  onPrev: () => void
}

export default function StepEtages({ onNext, onPrev }: StepEtagesProps) {
  const etages = useRoomDetailsStore(s => s.etages) as Etage[]
  const dakbedekking = useRoomDetailsStore(s => s.dakbedekking)
  const dakoversteekhoogte = useRoomDetailsStore(s => s.dakoversteekhoogte)
  const { setEtages, setDakbedekking, setDakoversteekhoogte } = useRoomDetailsStore()

  const addEtage = () =>
    setEtages([
      ...etages,
      { id: nanoid(), naam: '', type: 'verdieping', omschrijving: '' },
    ])

  const updateEtage = (id: string, patch: Partial<Etage>) =>
    setEtages(etages.map(e => (e.id === id ? { ...e, ...patch } : e)))

  const removeEtage = (id: string) =>
    setEtages(etages.filter(e => e.id !== id))

  return (
    <div className="space-y-3">
      {/* Etages list */}
      <div className="space-y-2">
        {etages.map((etage, index) => (
          <div key={etage.id} className="border border-dark-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="ui-label">Naam</span>
                <input
                  type="text"
                  className="ui-input text-sm py-1.5"
                  value={etage.naam}
                  placeholder="bijv. Eerste verdieping"
                  onChange={e => updateEtage(etage.id, { naam: e.target.value })}
                />
              </label>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeEtage(etage.id)}
                  className="shrink-0 mt-5 p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors duration-150"
                  aria-label="Etage verwijderen"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              )}
            </div>
            <label className="flex flex-col gap-1">
              <span className="ui-label">Type</span>
              <select
                className="ui-input text-sm py-1.5"
                value={etage.type}
                onChange={e => updateEtage(etage.id, { type: e.target.value as EtageType })}
              >
                {ETAGE_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="ui-label">Omschrijving</span>
              <textarea
                className="ui-input text-sm py-1.5 resize-none"
                rows={2}
                value={etage.omschrijving}
                placeholder="Optionele omschrijving..."
                onChange={e => updateEtage(etage.id, { omschrijving: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addEtage}
        className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-dark-border text-light/70 hover:text-light hover:border-accent/50 transition-colors duration-200"
      >
        + Etage toevoegen
      </button>

      {/* Daktype section */}
      <div className="border-t border-dark-border pt-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-light/40">Dakgegevens</p>
        <div className="rounded-lg bg-white/5 border border-dark-border px-3 py-2">
          <div className="flex justify-between text-xs">
            <span className="text-light/50">Daktype (kamer stap 1)</span>
            <span className="text-light/30 italic">Zie stap Kamer</span>
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="ui-label">Dakbedekking</span>
          <select
            className="ui-input text-sm py-1.5"
            value={dakbedekking}
            onChange={e => setDakbedekking(e.target.value)}
          >
            {DAKBEDEKKING_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="ui-label">Dakoversteekhoogte (cm)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="ui-input text-sm py-1.5 flex-1"
              value={dakoversteekhoogte}
              min={0}
              max={300}
              onChange={e => setDakoversteekhoogte(Number(e.target.value))}
            />
            <span className="text-xs text-light/40 shrink-0">cm</span>
          </div>
        </label>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onNext}
          className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors duration-200"
        >
          Volgende →
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
