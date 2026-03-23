import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { projectStore } from '../lib/projectStore';
import type { Project } from '../lib/database.types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setProjects(projectStore.all());
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) setProjects(data as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = useCallback(async (values: Partial<Project>) => {
    if (!supabase) {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: values.name ?? 'Nieuw Project',
        client_name: values.client_name ?? null,
        client_address: values.client_address ?? null,
        client_contact: values.client_contact ?? null,
        client_phone: values.client_phone ?? null,
        client_email: values.client_email ?? null,
        btw_nummer: values.btw_nummer ?? null,
        status: 'Concept',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      projectStore.set(newProject);
      setProjects(projectStore.all());
      return newProject;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(values)
      .select()
      .single();

    if (error) throw error;
    const project = data as Project;
    setProjects(prev => [project, ...prev]);
    return project;
  }, []);

  return { projects, loading, createProject, refetch: fetchProjects };
}
