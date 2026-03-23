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

  useEffect(() => {
    if (!supabase) return;
    fetchProjects();
  }, [fetchProjects]);

  const sortByUpdated = useCallback((list: Project[]) => {
    return [...list].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }, []);

  useEffect(() => {
    if (supabase) return;
    setProjects(sortByUpdated(projectStore.all()));
    setLoading(false);
    return projectStore.subscribe(() => {
      setProjects(sortByUpdated(projectStore.all()));
    });
  }, [sortByUpdated]);

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
        is_favorite: false,
      };
      projectStore.set(newProject);
      return newProject;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...values, is_favorite: false })
      .select()
      .single();

    if (error) throw error;
    const project = data as Project;
    setProjects(prev => [project, ...prev]);
    return project;
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!supabase) {
        const p = projectStore.get(id);
        if (!p) return;
        projectStore.set({
          ...p,
          is_favorite: !p.is_favorite,
          updated_at: new Date().toISOString(),
        });
        return;
      }

      const p = projects.find(x => x.id === id);
      if (!p) return;
      const { error } = await supabase
        .from('projects')
        .update({
          is_favorite: !p.is_favorite,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (!error) await fetchProjects();
    },
    [projects, fetchProjects],
  );

  return { projects, loading, createProject, toggleFavorite, refetch: fetchProjects };
}
