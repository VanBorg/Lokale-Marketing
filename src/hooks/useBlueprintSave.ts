import { useCallback, useEffect, useRef, useState } from 'react'
import { blueprintStore } from '../store/blueprintStore'
import { useRoomDetailsStore } from '../store/roomDetailsStore'
import { saveBlueprintData, loadBlueprintData } from '../lib/blueprintPersistence'

export function useBlueprintSave(projectId: string | null) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [werkbladNotities, setWerkbladNotities] = useState('')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveNow = useCallback(async (werkbladNotitiesOverride?: string) => {
    if (!projectId) return
    setIsSaving(true)
    try {
      const notes = werkbladNotitiesOverride ?? werkbladNotities
      const {
        rooms,
        roomOrder,
        elements,
        canvasTextNotes,
        canvasTextNoteOrder,
        measureLines,
      } = blueprintStore.getState()
      const roomDetailsState = useRoomDetailsStore.getState()
      await saveBlueprintData(projectId, {
        blueprintDoc: {
          rooms,
          roomOrder,
          elements,
          canvasTextNotes,
          canvasTextNoteOrder,
          measureLines,
        },
        roomDetails: roomDetailsState.getAllDetails(),
        etages: roomDetailsState.etages,
        dakbedekking: roomDetailsState.dakbedekking,
        dakoversteekhoogte: roomDetailsState.dakoversteekhoogte,
        lastSavedAt: new Date().toISOString(),
        werkbladNotities: notes,
      })
      setLastSaved(new Date())
      setIsDirty(false)
    } catch (e) {
      console.error('Opslaan mislukt:', e)
    } finally {
      setIsSaving(false)
    }
  }, [projectId, werkbladNotities])

  const saveNowRef = useRef(saveNow)
  saveNowRef.current = saveNow

  // Mark dirty when blueprintStore changes; auto-save after 3 s of inactivity
  useEffect(() => {
    if (!projectId) return
    const unsub = blueprintStore.subscribe(() => {
      setIsDirty(true)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => {
        void saveNowRef.current()
      }, 3000)
    })
    return () => {
      if (typeof unsub === 'function') unsub()
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadProject = useCallback(async () => {
    if (!projectId) return
    const data = await loadBlueprintData(projectId)
    if (!data) {
      setWerkbladNotities('')
      return
    }

    // Reset canvas store to this project and inject saved document state
    blueprintStore.getState().initProject(projectId)
    blueprintStore.setState({
      rooms: data.blueprintDoc.rooms,
      roomOrder: data.blueprintDoc.roomOrder,
      elements: data.blueprintDoc.elements,
      canvasTextNotes: data.blueprintDoc.canvasTextNotes ?? {},
      canvasTextNoteOrder: data.blueprintDoc.canvasTextNoteOrder ?? [],
      measureLines: data.blueprintDoc.measureLines ?? [],
    })
    blueprintStore.getState().recenterViewportToOrigin()

    // Hydrate builder data
    useRoomDetailsStore.getState().hydrate(
      Object.fromEntries(data.roomDetails.map(d => [d.roomId, d])),
      data.etages,
      data.dakbedekking,
      data.dakoversteekhoogte,
    )
    setWerkbladNotities(data.werkbladNotities ?? '')
    setLastSaved(new Date(data.lastSavedAt))
  }, [projectId])

  return {
    isSaving,
    lastSaved,
    isDirty,
    saveNow,
    loadProject,
    werkbladNotities,
    setWerkbladNotities,
  }
}
