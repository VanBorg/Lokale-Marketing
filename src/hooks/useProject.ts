import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { projectStore } from '../lib/projectStore';
import type { Project } from '../lib/database.types';

export function useProject(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    if (!supabase) {
      setProject(projectStore.get(id));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) setProject(data as Project);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const updateProject = useCallback(async (values: Partial<Project>) => {
    if (!id) return;

    if (!supabase) {
      setProject(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...values, updated_at: new Date().toISOString() };
        projectStore.set(updated);
        return updated;
      });
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) setProject(data as Project);
  }, [id]);

  const resetProject = useCallback(async () => {
    await updateProject({
      status: 'Concept',
      updated_at: new Date().toISOString(),
    });
  }, [updateProject]);

  return { project, loading, updateProject, resetProject, refetch: fetchProject };
}
