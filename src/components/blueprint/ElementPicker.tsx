import { memo, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { useBlueprintStore, blueprintStore, useActiveTool } from '../../store/blueprintStore'
import type { ElementType, ActiveTool } from '../../store/blueprintStore'

const ELEMENT_OPTIONS: { id: ElementType; label: string; icon: string }[] = [
  { id: 'deur', label: 'Deur', icon: '🚪' },
  { id: 'raam', label: 'Raam', icon: '🪟' },
  { id: 'trap', label: 'Trap', icon: '📐' },
  { id: 'kast', label: 'Kast', icon: '🗄️' },
  { id: 'overig', label: 'Overig', icon: '⬜' },
]

const ElementPicker = memo(function ElementPicker() {
  // Select the map (stable Immer reference), derive array with useMemo.
  // Selecting Object.values(...) directly would produce a new array reference
  // on every call, causing an infinite re-render loop in Zustand.
  const elementsMap = useBlueprintStore(s => s.elements)
  const elements = useMemo(() => Object.values(elementsMap), [elementsMap])
  const rooms = useBlueprintStore(s => s.rooms)
  const activeTool = useActiveTool()

  const handlePickElement = (type: ElementType) => {
    const toolName = (`add-${type}`) as ActiveTool
    blueprintStore.getState().setActiveTool(toolName)
  }

  const handleDelete = (id: string) => {
    blueprintStore.getState().deleteElement(id)
  }

  return (
    <div className="space-y-4">
      {/* Picker tiles */}
      <div className="grid grid-cols-3 gap-2">
        {ELEMENT_OPTIONS.map(opt => {
          const toolName = `add-${opt.id}` as string
          const isActive = activeTool === toolName
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePickElement(opt.id)}
              className={[
                'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all duration-150',
                'bg-dark hover:bg-dark-hover text-light/70 hover:text-light',
                isActive
                  ? 'border-accent text-accent shadow-[0_0_0_1px_#35B4D3]'
                  : 'border-dark-border',
              ].join(' ')}
              title={`Klik op een muur om een ${opt.label.toLowerCase()} te plaatsen`}
            >
              <span className="text-xl leading-none">{opt.icon}</span>
              <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-accent' : ''}`}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>

      {activeTool.startsWith('add-') && (
        <p className="text-[11px] text-accent/80 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
          Klik op een kamermuur om het element te plaatsen
        </p>
      )}

      {/* Placed elements list */}
      {elements.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-light/40 mb-2">
            Geplaatst
          </p>
          {elements.map(el => {
            const room = rooms[el.roomId]
            return (
              <div
                key={el.id}
                className="flex items-center justify-between px-3 py-2 bg-dark rounded-lg border border-dark-border"
              >
                <div>
                  <span className="text-xs text-light font-medium capitalize">{el.type}</span>
                  {room && (
                    <span className="text-[10px] text-light/40 ml-1.5">{room.name}</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(el.id)}
                  className="ui-icon-button text-light/30 hover:text-red-400"
                  aria-label="Verwijder element"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

export default ElementPicker
