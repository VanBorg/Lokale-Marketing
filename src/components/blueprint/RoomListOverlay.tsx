import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { blueprintStore, useBlueprintStore, useSelectedIds } from '../../store/blueprintStore'
import { polygonArea } from '../../utils/blueprintGeometry'

/**
 * Floating panel on the floor-plan canvas (top-left) that lists every placed
 * room in placement order.  Clicking a row selects that room, which
 * automatically drives the BuilderPanel into edit mode.
 */
export default function RoomListOverlay() {
  const [collapsed, setCollapsed] = useState(false)

  const roomOrder = useBlueprintStore(s => s.roomOrder)
  const rooms     = useBlueprintStore(s => s.rooms)
  const selectedIds = useSelectedIds()

  if (roomOrder.length === 0) return null

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null

  function handleSelect(id: string) {
    blueprintStore.getState().select([id])
    blueprintStore.getState().requestWallListExpandForRoom(id)
  }

  function handleDeselect() {
    blueprintStore.getState().clearSelection()
  }

  function handleDelete(id: string) {
    blueprintStore.getState().deleteRoom(id)
  }

  return (
    <div
      className={[
        'absolute top-3 left-3 z-20 pointer-events-auto',
        'bg-dark-card border border-dark-border rounded-lg shadow-lg',
        'text-xs font-medium text-light',
        'transition-all duration-200',
        'min-w-[10rem] max-w-[16rem]',
        'theme-light:bg-white theme-light:border-neutral-300',
      ].join(' ')}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className={[
          'flex w-full items-center justify-between gap-2 px-3 py-2',
          'rounded-t-lg hover:bg-accent/[0.06] transition-colors duration-200',
          collapsed ? 'rounded-b-lg' : 'border-b border-dark-border theme-light:border-neutral-300',
        ].join(' ')}
        title={collapsed ? 'Lijst uitklappen' : 'Lijst inklappen'}
      >
        <span className="uppercase tracking-wider text-[10px] font-semibold text-light/40">
          Kamers ({roomOrder.length})
        </span>
        {collapsed
          ? <ChevronDown size={13} className="shrink-0 text-light/40" />
          : <ChevronUp   size={13} className="shrink-0 text-light/40" />
        }
      </button>

      {/* Room rows */}
      {!collapsed && (
        <ul className="py-1">
          {roomOrder.map((id, index) => {
            const room       = rooms[id]
            const isSelected = id === selectedId
            const areaCm2    = room ? polygonArea(room.vertices) : 0
            const areaM2     = areaCm2 / 10_000

            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => handleSelect(id)}
                  className={[
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left',
                    'transition-colors duration-200',
                    isSelected
                      ? 'bg-accent/10 text-accent'
                      : 'hover:bg-accent/[0.05] text-light',
                  ].join(' ')}
                >
                  {/* Room number badge */}
                  <span
                    className={[
                      'shrink-0 inline-flex h-4 w-4 items-center justify-center',
                      'rounded text-[9px] font-bold leading-none',
                      isSelected
                        ? 'bg-accent text-dark'
                        : 'bg-dark-border text-light/60 theme-light:bg-neutral-200 theme-light:text-neutral-600',
                    ].join(' ')}
                  >
                    {index + 1}
                  </span>

                  {/* Name + area */}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate leading-tight">
                      {room?.name ?? `Kamer ${index + 1}`}
                    </span>
                    {areaCm2 > 0 && (
                      <span className={[
                        'block text-[10px] leading-tight',
                        isSelected ? 'text-accent/70' : 'text-light/40',
                      ].join(' ')}>
                        {(areaM2).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²
                      </span>
                    )}
                  </span>
                </button>

                {/* Inline actions for the selected room */}
                {isSelected && (
                  <div className="flex items-center gap-1 px-3 pb-1.5">
                    <button
                      type="button"
                      onClick={handleDeselect}
                      className="text-[10px] text-light/50 hover:text-light transition-colors"
                      title="Deselecteer"
                    >
                      Deselecteer
                    </button>
                    <span className="text-light/20">·</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(id)}
                      className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                      title="Verwijder kamer"
                    >
                      Verwijder
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
