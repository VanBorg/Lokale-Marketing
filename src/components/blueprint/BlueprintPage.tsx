import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import {
  blueprintStore,
  useBlueprintStore,
  useSelectedIds,
} from '../../store/blueprintStore'
import { polygonArea, wallLength } from '../../utils/blueprintGeometry'
import type { Point } from '../../utils/blueprintGeometry'
import { useBlueprintKeyboard } from '../../hooks/useBlueprintKeyboard'
import BlueprintTopBar from './BlueprintTopBar'
import BlueprintCanvas from './BlueprintCanvas'
import BuilderPanel from './BuilderPanel'
import RoomPreviewCanvas from './RoomPreviewCanvas'
import type { Project } from '../../lib/database.types'

interface BlueprintPageProps {
  project: Project
  onUpdateProject: (updates: Partial<Project>) => void
  onTabChange: (tab: string) => void
}

export default function BlueprintPage({ project, onUpdateProject, onTabChange }: BlueprintPageProps) {
  useEffect(() => {
    blueprintStore.getState().initProject(project.id)
  }, [project.id])

  useBlueprintKeyboard()

  const [previewVertices, setPreviewVertices] = useState<Point[]>([])
  const [previewWidth, setPreviewWidth]       = useState(400)
  const [previewDepth, setPreviewDepth]       = useState(300)

  const selectedIds    = useSelectedIds()
  const selectedRoomId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedRoom   = useBlueprintStore(s => selectedRoomId ? s.rooms[selectedRoomId] : null)

  const handleDelete = () => {
    if (!selectedRoomId) return
    blueprintStore.getState().deleteRoom(selectedRoomId)
    blueprintStore.getState().clearSelection()
  }

  const rotateRoom90 = () => {
    if (!selectedRoom) return
    const rotated = selectedRoom.vertices.map(v => ({ x: -v.y, y: v.x }))
    blueprintStore.getState().updateRoomVertices(selectedRoom.id, rotated)
  }

  const handleWallLengthChange = (wallIndex: number, value: number) => {
    if (!selectedRoom) return
    const clamped = Math.max(10, value)
    blueprintStore.getState().setWallLength(selectedRoom.id, wallIndex, clamped)
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <BlueprintTopBar
        project={project}
        onUpdateProject={onUpdateProject}
        onTabChange={onTabChange}
      />

      <div className="flex flex-1 min-h-0">

        {/* Column 1 — Canvas */}
        <div className="flex-[9] min-w-0 relative overflow-hidden flex flex-col">
          <BlueprintCanvas />

          {/* Floating selection bar — appears when exactly one room is selected */}
          {selectedRoom && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-dark-card border border-dark-border rounded-lg px-3 py-2 shadow-lg pointer-events-auto">
              <span className="text-xs font-semibold text-light">{selectedRoom.name}</span>
              <span className="text-xs text-light/40">
                {(polygonArea(selectedRoom.vertices) / 10000).toFixed(1)} m²
              </span>
              <div className="w-px h-4 bg-dark-border mx-0.5" />
              <button
                onClick={() => blueprintStore.getState().clearSelection()}
                className="text-xs text-light/50 hover:text-light transition-colors"
                title="Deselecteer"
              >
                ✕
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                title="Verwijder kamer"
              >
                Verwijder
              </button>
            </div>
          )}
        </div>

        {/* Column 2 — Live preview panel (340px) */}
        <div className="w-[340px] shrink-0 border-l border-dark-border bg-dark flex flex-col overflow-y-auto">

          {/* Header */}
          <div className="px-3 py-2 border-b border-dark-border shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
              Kamer
            </span>
          </div>

          {/* Preview canvas */}
          <div className="flex items-center justify-center p-3 shrink-0">
            <RoomPreviewCanvas
              vertices={selectedRoom ? selectedRoom.vertices : previewVertices}
              onChange={selectedRoom
                ? (verts) => blueprintStore.getState().updateRoomVertices(selectedRoom.id, verts)
                : setPreviewVertices
              }
              onDimensionChange={selectedRoom
                ? undefined
                : (w, d) => { setPreviewWidth(w); setPreviewDepth(d) }
              }
              width={312}
              height={280}
              room={selectedRoom}
              onToggleWallLock={selectedRoom
                ? (wallIndex) => blueprintStore.getState().toggleWallLock(selectedRoom.id, wallIndex)
                : undefined
              }
            />
          </div>

          {/* Walls section */}
          <div className="border-t border-dark-border shrink-0">
            <div className="px-3 py-1.5 border-b border-dark-border/50">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-light/30">
                Wanden
              </span>
            </div>

            {selectedRoom ? (
              <div className="divide-y divide-dark-border/40">
                {selectedRoom.vertices.map((_, i) => {
                  const a = selectedRoom.vertices[i]
                  const b = selectedRoom.vertices[(i + 1) % selectedRoom.vertices.length]
                  const len = Math.round(wallLength(a, b))
                  return (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1">
                      <span className="text-[10px] text-light/40 w-8 shrink-0">W {i + 1}</span>
                      <input
                        type="number"
                        className="ui-input text-xs py-0.5 flex-1 min-w-0"
                        value={len}
                        min={10}
                        onChange={e => handleWallLengthChange(i, Number(e.target.value))}
                        onKeyDown={e => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            handleWallLengthChange(i, len + 5)
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            handleWallLengthChange(i, len - 5)
                          }
                        }}
                      />
                      <span className="text-[10px] text-light/40 shrink-0">cm</span>
                      <div className="flex flex-col gap-px shrink-0">
                        <button
                          type="button"
                          onClick={() => handleWallLengthChange(i, len + 5)}
                          className="text-light/40 hover:text-light leading-none text-[10px] transition-colors"
                          title="+ 5 cm"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWallLengthChange(i, len - 5)}
                          className="text-light/40 hover:text-light leading-none text-[10px] transition-colors"
                          title="- 5 cm"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Rotate button */}
                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={rotateRoom90}
                    className="flex items-center gap-1.5 text-xs text-light/50 hover:text-light border border-dark-border hover:border-accent/40 rounded-lg px-3 py-1.5 transition-all duration-150"
                  >
                    <RotateCw size={12} />
                    Roteer 90°
                  </button>
                </div>
              </div>
            ) : (
              <p className="px-3 py-4 text-[10px] text-light/30 text-center leading-relaxed">
                Selecteer een kamer om wanden te bewerken
              </p>
            )}
          </div>

          {/* Breedte / Diepte inputs */}
          {previewVertices.length >= 3 && (
            <div className="px-3 pb-3 pt-2 border-t border-dark-border shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="ui-label">Breedte (cm)</span>
                  <input
                    type="number"
                    className="ui-input text-xs py-1"
                    value={previewWidth}
                    min={50}
                    max={5000}
                    onChange={e => setPreviewWidth(Number(e.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="ui-label">Diepte (cm)</span>
                  <input
                    type="number"
                    className="ui-input text-xs py-1"
                    value={previewDepth}
                    min={50}
                    max={5000}
                    onChange={e => setPreviewDepth(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          )}

          {previewVertices.length < 3 && (
            <div className="px-3 pb-3 pt-2 border-t border-dark-border shrink-0">
              <p className="text-[10px] text-light/30 text-center leading-relaxed">
                Kies een kamer in de Bouwer
              </p>
            </div>
          )}
        </div>

        {/* Column 3 — Builder panel (280px) */}
        <div className="w-[280px] shrink-0 border-l border-dark-border overflow-y-auto">
          <BuilderPanel
            onPreviewChange={setPreviewVertices}
            previewWidth={previewWidth}
            previewDepth={previewDepth}
            onWidthChange={setPreviewWidth}
            onDepthChange={setPreviewDepth}
          />
        </div>

      </div>
    </div>
  )
}
