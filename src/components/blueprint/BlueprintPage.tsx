import { useEffect, useState } from 'react'
import {
  blueprintStore,
  useBlueprintStore,
  useSelectedIds,
} from '../../store/blueprintStore'
import { polygonArea } from '../../utils/blueprintGeometry'
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

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <BlueprintTopBar
        project={project}
        onUpdateProject={onUpdateProject}
        onTabChange={onTabChange}
      />

      <div className="flex flex-1 min-h-0">

        {/* Column 1 — Canvas (~55%) */}
        <div className="flex-[11] min-w-0 relative overflow-hidden flex flex-col">
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

        {/* Column 2 — Live preview panel (280px) */}
        <div className="w-[280px] shrink-0 border-l border-dark-border bg-dark flex flex-col">
          <div className="px-3 py-2 border-b border-dark-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
              Kamer
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center p-3">
            <RoomPreviewCanvas
              vertices={previewVertices}
              onChange={setPreviewVertices}
              onDimensionChange={(w, d) => { setPreviewWidth(w); setPreviewDepth(d) }}
              width={252}
              height={252}
              room={selectedRoom}
              onToggleWallLock={selectedRoom
                ? (wallIndex) => blueprintStore.getState().toggleWallLock(selectedRoom.id, wallIndex)
                : undefined
              }
            />
          </div>
          {previewVertices.length >= 3 && (
            <div className="px-3 pb-3 pt-2 border-t border-dark-border">
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
            <div className="px-3 pb-3 pt-2 border-t border-dark-border">
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
