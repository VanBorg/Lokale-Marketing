import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useProjects } from '../../hooks/useProjects';
import ProjectCard from './ProjectCard';
import NewProjectDialog from './NewProjectDialog';

/** Projecten overzicht — grid van projectkaarten + Nieuw Project */
export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, loading, createProject } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async (values: Parameters<typeof createProject>[0]) => {
    const project = await createProject(values);
    if (project) navigate(`/project/${project.id}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-light">Projecten</h1>
          <p className="text-light/50 mt-1">Overzicht van al je projecten</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} className="mr-1.5" />
          Nieuw Project
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-dark-border border-t-accent animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-light/40 mb-4">Nog geen projecten aangemaakt</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Maak je eerste project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/project/${project.id}`)}
            />
          ))}
        </div>
      )}

      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
