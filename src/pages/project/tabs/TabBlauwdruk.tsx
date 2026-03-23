import BlueprintPage from '../../../components/blueprint/BlueprintPage';
import type { Project } from '../../../lib/database.types';

interface TabBlauwdrukProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  onTabChange: (tab: string) => void;
}

export default function TabBlauwdruk({ project, onUpdateProject, onTabChange }: TabBlauwdrukProps) {
  return (
    <BlueprintPage
      project={project}
      onUpdateProject={onUpdateProject}
      onTabChange={onTabChange}
    />
  );
}
