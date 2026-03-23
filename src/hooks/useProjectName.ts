import { useProjects } from './useProjects';

/** Resolves display name from the shared projects list (sync with sidebar). */
export function useProjectName(id: string | undefined) {
  const { projects } = useProjects();
  if (!id) return undefined;
  return projects.find(p => p.id === id)?.name;
}
