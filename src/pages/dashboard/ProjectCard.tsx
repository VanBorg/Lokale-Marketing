import { MapPin, Calendar, Star } from 'lucide-react';
import Card from '../../components/ui/Card';
import type { Project, ProjectStatus } from '../../lib/database.types';
import { projectStatusBadgeClass } from '../../lib/projectStatusUi';

const statusLabel: Record<ProjectStatus, string> = {
  Concept: 'Concept',
  'Offerte Verstuurd': 'Offerte',
  Akkoord: 'Akkoord',
  'In Uitvoering': 'In uitvoering',
  Afgerond: 'Afgerond',
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
  onToggleFavorite: () => void;
}

/** Zie ui.css: .ui-project-card, .ui-project-card__* */
export default function ProjectCard({ project, onClick, onToggleFavorite }: ProjectCardProps) {
  const favorite = Boolean(project.is_favorite);

  return (
    <Card hover onClick={onClick} className="ui-project-card group relative">
      <div className="ui-project-card__accent-bar" aria-hidden />

      <button
        type="button"
        aria-label={favorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
        aria-pressed={favorite}
        className={`absolute right-3 top-3 z-10 rounded-md p-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          favorite
            ? 'fill-amber-400 text-amber-400'
            : 'text-light/20 hover:text-light/50'
        }`}
        onClick={e => {
          e.stopPropagation();
          onToggleFavorite();
        }}
      >
        <Star size={18} className={favorite ? 'fill-current' : ''} strokeWidth={favorite ? 0 : 2} />
      </button>

      <div className="flex items-start justify-between gap-3 pr-9">
        <h3 className="ui-project-card__title">{project.name}</h3>
        <span className={`ui-badge shrink-0 ${projectStatusBadgeClass[project.status]}`}>
          {statusLabel[project.status]}
        </span>
      </div>

      {project.client_name && (
        <p className="mt-2 text-xs font-medium text-light/70">{project.client_name}</p>
      )}
      {project.client_address && (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-light/45">
          <MapPin size={12} className="mt-0.5 shrink-0 text-accent/70" aria-hidden />
          <span className="min-w-0 leading-relaxed">{project.client_address}</span>
        </p>
      )}

      <p className="ui-project-card__footer">
        <Calendar size={12} className="shrink-0 text-accent/50" aria-hidden />
        <span>Laatst gewijzigd: {formatDate(project.updated_at)}</span>
      </p>
    </Card>
  );
}
