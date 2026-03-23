import Card from '../../components/ui/Card';
import type { Project, ProjectStatus } from '../../lib/database.types';

const statusStyles: Record<ProjectStatus, string> = {
  Concept: 'bg-light/10 text-light/60',
  'Offerte Verstuurd': 'bg-accent/15 text-accent',
  Akkoord: 'bg-green-500/15 text-green-400',
  'In Uitvoering': 'bg-amber-500/15 text-amber-400',
  Afgerond: 'bg-light/5 text-light/40',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <Card hover onClick={onClick}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-light truncate">{project.name}</h3>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[project.status]}`}
        >
          {project.status}
        </span>
      </div>

      {project.client_name && (
        <p className="text-xs text-light/50 truncate">{project.client_name}</p>
      )}
      {project.client_address && (
        <p className="text-xs text-light/40 truncate mt-0.5">{project.client_address}</p>
      )}

      <p className="text-xs text-light/30 mt-3">
        Laatst gewijzigd: {formatDate(project.updated_at)}
      </p>
    </Card>
  );
}
