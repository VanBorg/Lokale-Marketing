import { useState } from 'react'
import { nanoid } from 'nanoid'
import { useRoomDetailsStore } from '../../../store/roomDetailsStore'

type OpeningType = 'deur' | 'raam' | 'schuifdeur' | 'dakraam' | 'overig'

interface OpeningItem {
  id: string
  type: OpeningType
  breedte: number
  hoogte: number
  aantal: number
  wandIndex: number | null
  bijzonderheid: string
}

interface OpeningRowProps {
  item: OpeningItem
  onChange: (updated: OpeningItem) => void
  onRemove: () => void
}

function OpeningRow({ item, onChange, onRemove }: OpeningRowProps) {
  const set = <K extends keyof OpeningItem>(key: K, value: OpeningItem[K]) =>
    onChange({ ...item, [key]: value })

  return (
    <div className="flex items-center gap-1.5 py-1.5 border-b border-dark-border last:border-0">
      <select
        className="ui-input text-xs py-1 w-24 shrink-0"
        value={item.type}
        onChange={e => set('type', e.target.value as OpeningType)}
      >
        <option value="deur">Deur</option>
        <option value="raam">Raam</option>
        <option value="schuifdeur">Schuifdeur</option>
        <option value="dakraam">Dakraam</option>
        <option value="overig">Overig</option>
      </select>
      <div className="flex items-center gap-0.5 flex-1 min-w-0">
        <input
          type="number"
          className="ui-input text-xs py-1 w-14 min-w-0"
          title="Breedte (cm)"
          placeholder="B"
          value={item.breedte}
          min={1}
          onChange={e => set('breedte', Number(e.target.value))}
        />
        <span className="text-light/30 text-xs shrink-0">×</span>
        <input
          type="number"
          className="ui-input text-xs py-1 w-14 min-w-0"
          title="Hoogte (cm)"
          placeholder="H"
          value={item.hoogte}
          min={1}
          onChange={e => set('hoogte', Number(e.target.value))}
        />
      </div>
      <input
        type="number"
        className="ui-input text-xs py-1 w-10 shrink-0"
        title="Aantal"
        value={item.aantal}
        min={1}
        onChange={e => set('aantal', Number(e.target.value))}
      />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors duration-150"
        aria-label="Verwijderen"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </button>
    </div>
  )
}

interface StepOpeningenProps {
  roomId: string | null
  onNext: () => void
  onPrev: () => void
}

function makeOpening(type: OpeningType): OpeningItem {
  return {
    id: nanoid(),
    type,
    breedte: type === 'deur' ? 90 : 100,
    hoogte: type === 'deur' ? 210 : 120,
    aantal: 1,
    wandIndex: null,
    bijzonderheid: '',
  }
}

export default function StepOpeningen({ roomId, onNext, onPrev }: StepOpeningenProps) {
  const storedOpeningen = useRoomDetailsStore(s => (roomId ? s.details[roomId]?.openingen : undefined))

  const [items, setItems] = useState<OpeningItem[]>(() =>
    storedOpeningen && storedOpeningen.length > 0
      ? storedOpeningen.map(o => ({
          id: o.id,
          type: o.type as OpeningType,
          breedte: o.breedte,
          hoogte: o.hoogte,
          aantal: o.aantal,
          wandIndex: o.wandIndex,
          bijzonderheid: o.bijzonderheid,
        }))
      : [],
  )

  const addItem = (type: OpeningType) =>
    setItems(prev => [...prev, makeOpening(type)])

  const updateItem = (id: string, updated: OpeningItem) =>
    setItems(prev => prev.map(it => (it.id === id ? updated : it)))

  const removeItem = (id: string) =>
    setItems(prev => prev.filter(it => it.id !== id))

  const raamOpp = items
    .filter(it => it.type === 'raam' || it.type === 'dakraam')
    .reduce((sum, it) => sum + (it.breedte * it.hoogte * it.aantal) / 10000, 0)

  const deurOpp = items
    .filter(it => it.type === 'deur' || it.type === 'schuifdeur')
    .reduce((sum, it) => sum + (it.breedte * it.hoogte * it.aantal) / 10000, 0)

  return (
    <div className="space-y-3">
      {/* Add buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => addItem('deur')}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-dark-border text-light/70 hover:text-light hover:border-accent/50 transition-colors duration-200"
        >
          + Deur toevoegen
        </button>
        <button
          type="button"
          onClick={() => addItem('raam')}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-dark-border text-light/70 hover:text-light hover:border-accent/50 transition-colors duration-200"
        >
          + Raam toevoegen
        </button>
      </div>

      {/* Column headers */}
      {items.length > 0 && (
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-[10px] text-light/30 w-24 shrink-0">Type</span>
          <span className="text-[10px] text-light/30 flex-1">B × H (cm)</span>
          <span className="text-[10px] text-light/30 w-10 shrink-0 text-center">#</span>
          <span className="w-6 shrink-0" />
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <p className="text-xs text-light/30 text-center py-4">Nog geen openingen toegevoegd</p>
      ) : (
        <div className="rounded-lg border border-dark-border px-2">
          {items.map(item => (
            <OpeningRow
              key={item.id}
              item={item}
              onChange={updated => updateItem(item.id, updated)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <div className="rounded-lg bg-white/5 border border-dark-border px-3 py-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-light/50">Totaal raamoppervlak</span>
            <span className="text-light/70">{raamOpp.toFixed(2)} m²</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-light/50">Totaal deuropeningen</span>
            <span className="text-light/70">{deurOpp.toFixed(2)} m²</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (roomId) {
              useRoomDetailsStore.getState().setOpeningen(roomId, items)
            }
            onNext()
          }}
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
