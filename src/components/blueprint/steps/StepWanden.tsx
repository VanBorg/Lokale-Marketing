import { useMemo, useState } from 'react'
import { blueprintStore, useRoom, type Room } from '../../../store/blueprintStore'
import { useRoomDetailsStore } from '../../../store/roomDetailsStore'
import {
  clampCmFromMetersField,
  cmToMeterFieldValue,
  formatNlDecimal,
} from '../../../utils/blueprintGeometry'
import {
  ROOF_OPTIONS,
  showRoofPeakHeight,
  vlakCeilingHeightFromRoom,
} from '../roomStructureHelpers'

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

function wallUpdatesWithOptionalVlakCeiling(
  room: Room,
  updates: Partial<Pick<Room, 'wallHeight' | 'wallHeights'>>,
): Partial<Room> {
  const merged: Room = { ...room, ...updates }
  if (!room.ceiling || room.ceiling.type === 'vlak') {
    return {
      ...updates,
      ceiling: { type: 'vlak', height: vlakCeilingHeightFromRoom(merged) },
    }
  }
  return updates
}

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

  const wallHeightMode =
    room && (room.wallHeights?.length ?? 0) > 0 ? 'per-wall' : 'uniform'

  const showPeak = room ? showRoofPeakHeight(room.roofType) : false

  function updateWall(index: number, patch: Partial<WallData>) {
    setWalls(prev => {
      const next = prev.length === wallCount ? [...prev] : Array.from({ length: wallCount }, (_, i) => prev[i] ?? { ...DEFAULT_WALL })
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  function pushRoomPatch(patch: Partial<Room>) {
    if (!roomId) return
    blueprintStore.getState().updateRoom(roomId, patch)
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
      {/* Wandhoogte — uniform / per-wand */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="ui-label">Wandhoogte</span>
          <div className="flex rounded-md border border-dark-border overflow-hidden text-[10px]">
            <button
              type="button"
              onClick={() => {
                pushRoomPatch(wallUpdatesWithOptionalVlakCeiling(room, { wallHeights: [] }))
              }}
              className={[
                'px-2 py-0.5 transition-colors',
                wallHeightMode === 'uniform'
                  ? 'bg-accent text-white'
                  : 'text-neutral-400 hover:text-neutral-200 theme-light:text-neutral-600 theme-light:hover:text-neutral-900',
              ].join(' ')}
            >
              Gelijk
            </button>
            <button
              type="button"
              onClick={() => {
                const n = room.vertices.length
                const heights = Array.from(
                  { length: n },
                  (_, i) => room.wallHeights?.[i] ?? room.wallHeight,
                )
                pushRoomPatch(wallUpdatesWithOptionalVlakCeiling(room, { wallHeights: heights }))
              }}
              className={[
                'px-2 py-0.5 border-l border-dark-border transition-colors',
                wallHeightMode === 'per-wall'
                  ? 'bg-accent text-white'
                  : 'text-neutral-400 hover:text-neutral-200 theme-light:text-neutral-600 theme-light:hover:text-neutral-900',
              ].join(' ')}
            >
              Per wand
            </button>
          </div>
        </div>

        {wallHeightMode === 'uniform' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="ui-input text-sm py-1.5 flex-1 tabular-nums"
              value={cmToMeterFieldValue(room.wallHeight)}
              min={1}
              max={6}
              step={0.01}
              onChange={e => {
                const m = parseFloat(e.target.value)
                if (Number.isNaN(m)) return
                const v = clampCmFromMetersField(m, 100, 600)
                pushRoomPatch(wallUpdatesWithOptionalVlakCeiling(room, { wallHeight: v }))
              }}
            />
            <span className="shrink-0 text-xs text-neutral-500 theme-light:text-neutral-600">m</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {Array.from({ length: wallCount }, (_, i) => (
              <label key={i} className="flex items-center gap-1">
                <span className="w-6 shrink-0 text-[10px] text-neutral-500 theme-light:text-neutral-600">
                  W{i + 1}
                </span>
                <input
                  type="number"
                  className="ui-input text-xs py-1 flex-1 min-w-0 tabular-nums"
                  value={cmToMeterFieldValue(room.wallHeights?.[i] ?? room.wallHeight)}
                  min={1}
                  max={6}
                  step={0.01}
                  onChange={e => {
                    const m = parseFloat(e.target.value)
                    if (Number.isNaN(m)) return
                    const nextH = clampCmFromMetersField(m, 100, 600)
                    const nextHeights = Array.from({ length: wallCount }, (_, j) =>
                      j === i ? nextH : (room.wallHeights?.[j] ?? room.wallHeight),
                    )
                    pushRoomPatch(
                      wallUpdatesWithOptionalVlakCeiling(room, { wallHeights: nextHeights }),
                    )
                  }}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Daktype */}
      <label className="flex flex-col gap-1">
        <span className="ui-label">Daktype</span>
        <div className="grid grid-cols-3 gap-1.5">
          {ROOF_OPTIONS.map((roof, idx) => (
            <button
              key={roof.id}
              type="button"
              onClick={() => pushRoomPatch({ roofType: roof.id })}
              className={[
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all duration-150',
                idx === 0 ? 'col-span-3' : '',
                room.roofType === roof.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-dark-border bg-dark text-neutral-400 hover:border-accent/40 hover:text-neutral-200 theme-light:border-neutral-300 theme-light:bg-neutral-50 theme-light:text-neutral-700 theme-light:hover:text-neutral-900',
              ].join(' ')}
            >
              <span className="text-base leading-none">{roof.icon}</span>
              <span className="text-[9px]">{roof.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-neutral-500 theme-light:text-neutral-600">
          Kies &ldquo;Geen&rdquo; als er geen dak hoort bij deze ruimte (bijv. verdieping erboven).
        </p>
      </label>

      {showPeak && (
        <label className="flex flex-col gap-1">
          <span className="ui-label">Dakoverstijging (m)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="ui-input text-sm py-1.5 flex-1 tabular-nums"
              value={cmToMeterFieldValue(room.roofPeakHeight ?? 150)}
              min={0.1}
              max={10}
              step={0.01}
              onChange={e => {
                const m = parseFloat(e.target.value)
                if (Number.isNaN(m)) return
                const v = clampCmFromMetersField(m, 10, 1000)
                pushRoomPatch({ roofPeakHeight: v })
              }}
            />
            <span className="shrink-0 text-xs text-neutral-500 theme-light:text-neutral-600">m</span>
          </div>
          <span className="text-[10px] text-neutral-500 theme-light:text-neutral-600">
            Hoogte boven de muren tot het hoogste punt
          </span>
        </label>
      )}

      <p className="text-[10px] leading-snug text-neutral-500 theme-light:text-neutral-600">
        Plafondtype en plafondhoogtes (behalve vlak) stel je in bij stap <span className="font-medium text-light/70 theme-light:text-neutral-700">Plafond</span> (5).
      </p>

      {/* Per-wand materiaal */}
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

      <div className="flex items-center justify-between rounded-lg border border-dark-border bg-neutral-900/20 px-3 py-2 theme-light:border-neutral-200 theme-light:bg-neutral-100">
        <span className="text-xs text-neutral-400 theme-light:text-neutral-600">Totaal wandoppervlak</span>
        <span className="text-sm font-semibold text-accent tabular-nums">
          {formatNlDecimal(totalSqM, 2)} m²
        </span>
      </div>

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
