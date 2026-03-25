import { useCallback, useEffect, useRef, useState } from 'react'
import { blueprintStore } from '../store/blueprintStore'
import { useRoomDetailsStore } from '../store/roomDetailsStore'
import { saveBlueprintData, loadBlueprintData } from '../lib/blueprintPersistence'

export function useBlueprintSave(projectId: string | null) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mark dirty when blueprintStore changes; auto-save after 3 s of inactivity
  useEffect(() => {
    if (!projectId) return
    const unsub = blueprintStore.subscribe(() => {
      setIsDirty(true)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => {
        saveNow()
      }, 3000)
    })
    return () => {
      unsub()
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const saveNow = useCallback(async () => {
    if (!projectId) return
    setIsSaving(true)
    try {
      const { rooms, roomOrder, elements } = blueprintStore.getState()
      const roomDetailsState = useRoomDetailsStore.getState()
      await saveBlueprintData(projectId, {
        blueprintDoc: { rooms, roomOrder, elements },
        roomDetails: roomDetailsState.getAllDetails(),
        etages: roomDetailsState.etages,
        dakbedekking: roomDetailsState.dakbedekking,
        dakoversteekhoogte: roomDetailsState.dakoversteekhoogte,
        lastSavedAt: new Date().toISOString(),
      })
      setLastSaved(new Date())
      setIsDirty(false)
    } catch (e) {
      console.error('Opslaan mislukt:', e)
    } finally {
      setIsSaving(false)
    }
  }, [projectId])

  const loadProject = useCallback(async () => {
    if (!projectId) return
    const data = await loadBlueprintData(projectId)
    if (!data) return

    // Reset canvas store to this project and inject saved document state
    blueprintStore.getState().initProject(projectId)
    blueprintStore.setState({
      rooms: data.blueprintDoc.rooms,
      roomOrder: data.blueprintDoc.roomOrder,
      elements: data.blueprintDoc.elements,
    })
    blueprintStore.getState().recenterViewportToOrigin()

    // Hydrate builder data
    useRoomDetailsStore.getState().hydrate(
      Object.fromEntries(data.roomDetails.map(d => [d.roomId, d])),
      data.etages,
      data.dakbedekking,
      data.dakoversteekhoogte,
    )
    setLastSaved(new Date(data.lastSavedAt))
  }, [projectId])

  return { isSaving, lastSaved, isDirty, saveNow, loadProject }
}
