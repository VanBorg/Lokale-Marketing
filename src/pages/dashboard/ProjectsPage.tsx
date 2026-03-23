import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useProjects } from '../../hooks/useProjects';
import type { ProjectStatus } from '../../lib/database.types';
import ProjectCard from './ProjectCard';
import NewProjectDialog from './NewProjectDialog';

const STATUS_STATS: { status: ProjectStatus; label: string }[] = [
  { status: 'Concept', label: 'Concept' },
  { status: 'Offerte Verstuurd', label: 'Offerte' },
  { status: 'Akkoord', label: 'Akkoord' },
  { status: 'In Uitvoering', label: 'In uitvoering' },
  { status: 'Afgerond', label: 'Afgerond' },
];

/** Projecten overzicht — zie ui.css: .ui-projects-summary, .ui-stat-chip */
export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, loading, createProject, toggleFavorite } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('nieuw') === '1') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCreate = async (values: Parameters<typeof createProject>[0]) => {
    const project = await createProject(values);
    if (project) navigate(`/project/${project.id}`);
  };

  const statItems = [
    { label: 'Totaal', value: projects.length },
    ...STATUS_STATS.map(({ status, label }) => ({
      label,
      value: projects.filter(p => p.status === status).length,
    })),
  ];

  return (
    <div>
      <div className="ui-projects-summary">
        <div className="ui-projects-summary__layout">
          <div className="ui-projects-summary__title">
            <h1 className="text-xl font-bold text-light sm:text-2xl">Alle Projecten</h1>
            <p className="mt-0.5 text-sm text-light/50">Overzicht van al je projecten</p>
          </div>

          <div className="ui-projects-summary__stats">
            {statItems.map((stat, i) => (
              <div
                key={stat.label}
                className={`ui-stat-chip ${i === 0 ? 'ui-stat-chip--primary' : ''}`}
              >
                <p className="ui-stat-chip__value">{stat.value}</p>
                <p className="ui-stat-chip__label">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/project/${project.id}`)}
              onToggleFavorite={() => toggleFavorite(project.id)}
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
