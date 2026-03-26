import {
  blueprintStore,
  useActiveTool,
  useSnapEnabled,
  useGridEnabled,
} from '../../store/blueprintStore'
import type { ActiveTool } from '../../store/blueprintStore'

export function useToolbarState() {
  const activeTool  = useActiveTool()
  const snapEnabled = useSnapEnabled()
  const gridEnabled = useGridEnabled()

  return {
    activeTool,
    snapEnabled,
    gridEnabled,
    setActiveTool:  (tool: ActiveTool) => blueprintStore.getState().setActiveTool(tool),
    setSnapEnabled: (enabled: boolean) => blueprintStore.getState().setSnapEnabled(enabled),
    setGridEnabled: (enabled: boolean) => blueprintStore.getState().setGridEnabled(enabled),
  }
}
