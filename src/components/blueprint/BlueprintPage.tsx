import { useEffect } from 'react'
import { blueprintStore } from '../../store/blueprintStore'
import { useBlueprintKeyboard } from '../../hooks/useBlueprintKeyboard'
import BlueprintTopBar from './BlueprintTopBar'
import BlueprintCanvas from './BlueprintCanvas'
import BuilderPanel from './BuilderPanel'
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

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <BlueprintTopBar
        project={project}
        onUpdateProject={onUpdateProject}
        onTabChange={onTabChange}
      />

      <div className="flex flex-1 min-h-0">
        {/* Canvas — left 50% */}
        <div className="flex-1 min-w-0 relative overflow-hidden">
          <BlueprintCanvas />
        </div>

        {/* Builder panel — right 50%, scrollable */}
        <div className="w-1/2 shrink-0 border-l border-dark-border overflow-y-auto">
          <BuilderPanel />
        </div>
      </div>
    </div>
  )
}
