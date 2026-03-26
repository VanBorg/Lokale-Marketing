import { blueprintStore, useBlueprintStore, useSelectedIds } from '../../store/blueprintStore'
import { formatNlDecimal, polygonArea } from '../../utils/blueprintGeometry'

export default function RoomListPanel() {
  const roomOrder = useBlueprintStore(s => s.roomOrder)
  const rooms = useBlueprintStore(s => s.rooms)
  const selectedIds = useSelectedIds()

  if (roomOrder.length === 0) return null

  return (
    <div className="shrink-0 border-b border-dark-border">
      <div className="flex items-center border-b border-dark-border px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
          Kamers
        </span>
        <span className="ml-auto text-[10px] tabular-nums text-light/25">
          {roomOrder.length}
        </span>
      </div>

      <div className="max-h-[180px] overflow-y-auto">
        {roomOrder.map((id, index) => {
          const room = rooms[id]
          if (!room) return null

          const isSelected = selectedIds.length === 1 && selectedIds[0] === id
          const areaCm2 = room.vertices.length >= 3 ? polygonArea(room.vertices) : 0
          const areaM2 = areaCm2 / 10000

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                blueprintStore.getState().select([id])
                blueprintStore.getState().requestWallListExpandForRoom(id)
              }}
              className={[
                'flex w-full items-center gap-2 px-3 py-2 text-left transition-all duration-150',
                isSelected
                  ? 'bg-accent/10 border-l-2 border-accent'
                  : 'border-l-2 border-transparent hover:bg-dark-border/40',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                  isSelected
                    ? 'bg-accent text-white'
                    : 'bg-dark-border text-light/50',
                ].join(' ')}
              >
                {index + 1}
              </span>
              <span
                className={[
                  'flex-1 truncate text-xs font-medium',
                  isSelected ? 'text-accent' : 'text-light/75',
                ].join(' ')}
              >
                {room.name || `Kamer ${index + 1}`}
              </span>
              {areaCm2 > 0 && (
                <span className="shrink-0 text-[10px] tabular-nums text-light/35">
                  {formatNlDecimal(areaM2, 1)} m²
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
