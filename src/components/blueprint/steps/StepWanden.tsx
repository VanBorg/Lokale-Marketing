import { useState, useMemo } from 'react'
import { useRoom } from '../../../store/blueprintStore'
import { useRoomDetailsStore } from '../../../store/roomDetailsStore'
import {
  clampCmFromMetersField,
  cmToMeterFieldValue,
  formatNlDecimal,
} from '../../../utils/blueprintGeometry'

type WallMaterial = 'Beton' | 'Kalkzandsteen' | 'Houtskelet' | 'Gipsblok' | 'Overig'

interface WallData {
  material: WallMaterial
  thickness: number
  loadBearing: boolean
  exterior: boolean
  wetRoom: boolean
}

const DEFAULT_WALL: WallData = {
  material: 'Beton',
  thickness: 20,
  loadBearing: false,
  exterior: false,
  wetRoom: false,
}

const MATERIALS: WallMaterial[] = [
  'Beton',
  'Kalkzandsteen',
  'Houtskelet',
  'Gipsblok',
  'Overig',
]

interface Props {
  roomId: string | null
  onNext: () => void
  onPrev: () => void
}

export default function StepWanden({ roomId, onNext, onPrev }: Props) {
  const room = useRoom(roomId ?? '')
  const storedWanden = useRoomDetailsStore(s => (roomId ? s.details[roomId]?.wanden : undefined))

  const wallCount = room?.vertices?.length ?? 0

  const [walls, setWalls] = useState<WallData[]>(() => {
    if (storedWanden && storedWanden.length > 0) {
      return storedWanden.map(w => ({
        material: w.material as WallMaterial,
        thickness: w.thickness,
        loadBearing: w.loadBearing,
        exterior: w.exterior,
        wetRoom: w.wetRoom,
      }))
    }
    return Array.from({ length: wallCount }, () => ({ ...DEFAULT_WALL }))
  })

  // Sync state when wallCount changes (e.g. room shape changed)
  const syncedWalls = useMemo(() => {
    if (walls.length === wallCount) return walls
    if (wallCount === 0) return []
    return Array.from({ length: wallCount }, (_, i) => walls[i] ?? { ...DEFAULT_WALL })
  }, [wallCount, walls])

  const wallMetrics = useMemo(() => {
    if (!room) return []
    const verts = room.vertices
    return verts.map((v, i) => {
      const next = verts[(i + 1) % verts.length]
      const lengthCm = Math.hypot(next.x - v.x, next.y - v.y)
      const heightCm = room.wallHeights?.[i] ?? room.wallHeight
      const areaSqM = (lengthCm * heightCm) / 10_000
      return { lengthCm, heightCm, areaSqM }
    })
  }, [room])

  const totalSqM = wallMetrics.reduce((sum, w) => sum + w.areaSqM, 0)

  function updateWall(index: number, patch: Partial<WallData>) {
    setWalls(prev => {
      const next = prev.length === wallCount ? [...prev] : Array.from({ length: wallCount }, (_, i) => prev[i] ?? { ...DEFAULT_WALL })
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  if (!room) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-neutral-400 theme-light:text-neutral-600">
          Plaats eerst een kamer in stap 1 voordat je de wanden kunt invullen.
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

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {wallMetrics.map((metric, i) => {
          const wall = syncedWalls[i] ?? DEFAULT_WALL
          return (
            <div
              key={i}
              className="space-y-2 rounded-lg border border-dark-border bg-neutral-900/20 p-2.5 theme-light:border-neutral-200 theme-light:bg-neutral-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200 theme-light:text-neutral-900">
                  Wand {i + 1}
                </span>
                <span className="text-[10px] font-medium text-accent tabular-nums">
                  {formatNlDecimal(metric.areaSqM, 2)} m²
                </span>
              </div>

              {/* Materiaal */}
              <label className="flex flex-col gap-1">
                <span className="ui-label">Materiaal</span>
                <select
                  className="ui-input text-sm py-1.5"
                  value={wall.material}
                  onChange={e => updateWall(i, { material: e.target.value as WallMaterial })}
                >
                  {MATERIALS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>

              {/* Dikte */}
              <label className="flex flex-col gap-1">
                <span className="ui-label">Dikte (m)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    className="ui-input text-sm py-1.5 flex-1 min-w-0 tabular-nums"
                    value={cmToMeterFieldValue(wall.thickness)}
                    min={0.05}
                    max={1}
                    step={0.01}
                    onChange={e =>
                      updateWall(i, {
                        thickness: clampCmFromMetersField(parseFloat(e.target.value), 5, 100),
                      })
                    }
                  />
                  <span className="shrink-0 text-xs text-neutral-500 theme-light:text-neutral-600">m</span>
                </div>
              </label>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-dark-border theme-light:border-neutral-300"
                    checked={wall.loadBearing}
                    onChange={e => updateWall(i, { loadBearing: e.target.checked })}
                  />
                  <span className="ui-label !mb-0">Dragende muur</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-dark-border theme-light:border-neutral-300"
                    checked={wall.exterior}
                    onChange={e => updateWall(i, { exterior: e.target.checked })}
                  />
                  <span className="ui-label !mb-0">Buitenmuur</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-dark-border theme-light:border-neutral-300"
                    checked={wall.wetRoom}
                    onChange={e => updateWall(i, { wetRoom: e.target.checked })}
                  />
                  <span className="ui-label !mb-0">Natte ruimte</span>
                </label>
              </div>
            </div>
          )
        })}
      </div>

      {/* Totaal */}
      <div className="flex items-center justify-between rounded-lg border border-dark-border bg-neutral-900/20 px-3 py-2 theme-light:border-neutral-200 theme-light:bg-neutral-100">
        <span className="text-xs text-neutral-400 theme-light:text-neutral-600">Totaal wandoppervlak</span>
        <span className="text-sm font-semibold text-accent tabular-nums">
          {formatNlDecimal(totalSqM, 2)} m²
        </span>
      </div>

      {/* Navigatie */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (roomId) {
              useRoomDetailsStore.getState().setWanden(
                roomId,
                syncedWalls.map((w, i) => ({ wallIndex: i, ...w })),
              )
            }
            onNext()
          }}
          className="w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 bg-accent text-white hover:bg-accent/90"
        >
          Volgende →
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
