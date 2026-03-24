import { Link, useMatch, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import type { Project, ProjectStatus } from '../../lib/database.types';

function statusDotClass(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    Concept: 'bg-light/30',
    'Offerte Verstuurd': 'bg-accent',
    Akkoord: 'bg-green-400',
    'In Uitvoering': 'bg-amber-400',
    Afgerond: 'bg-light/20',
  };
  return map[status];
}

function sortByUpdatedDesc(a: Project, b: Project) {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

const sectionHeaderClass =
  'text-[10px] font-semibold uppercase tracking-wider text-light/42 theme-light:text-light/58 px-3 pt-3 pb-1';

function ProjectSidebarRow({
  project,
  isOpen,
  activeId,
}: {
  project: Project;
  isOpen: boolean;
  activeId: string | undefined;
}) {
  const isActive = activeId === project.id;
  const dotClass = statusDotClass(project.status);
  const rowClass = isActive ? 'ui-sidebar-link ui-sidebar-link--active' : 'ui-sidebar-link';

  if (!isOpen) {
    return (
      <Link
        to={`/project/${project.id}`}
        className={`ui-sidebar-link--collapsed ${isActive ? 'ui-sidebar-link--active' : ''}`}
        aria-label={
          project.client_name ? `${project.name}, ${project.client_name}` : project.name
        }
      >
        <span
          className={`h-1 min-h-1 w-1 min-w-1 shrink-0 rounded-full ${dotClass}`}
        />
      </Link>
    );
  }

  return (
    <Link to={`/project/${project.id}`} className={rowClass}>
      <span className={`h-1 min-h-1 w-1 min-w-1 shrink-0 rounded-full ${dotClass}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{project.name}</span>
        {project.client_name ? (
          <span
            className={`truncate text-xs ${isActive ? 'text-accent/70' : 'text-light/50'}`}
          >
            {project.client_name}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { projects, loading } = useProjects();
  const match = useMatch('/project/:id');
  const activeId = match?.params?.id;
  const isDashboard = !!useMatch('/');
  const navigate = useNavigate();

  const favorites = projects.filter(p => p.is_favorite).sort(sortByUpdatedDesc);
  const recent = projects
    .filter(p => !p.is_favorite)
    .sort(sortByUpdatedDesc)
    .slice(0, 5);
  const collapsedList = [...favorites, ...recent];

  return (
    <aside
      className={`ui-sidebar ${isOpen ? 'ui-sidebar--open' : 'ui-sidebar--collapsed'}`}
    >
      {/* Dashboard: no button. All other pages: back-to-dashboard navigation. */}
      {!isDashboard && (
        <button
          type="button"
          onClick={() => navigate('/')}
          title="Terug naar Dashboard"
          className="ui-sidebar-toggle"
        >
          <ArrowLeft size={16} />
        </button>
      )}

      {isOpen && (
        <Link
          to="/projects?nieuw=1"
          className="ui-btn ui-btn--primary ui-btn--md mx-2 mt-2 flex w-[calc(100%-1rem)] items-center justify-center gap-2"
        >
          <Plus size={16} strokeWidth={2} />
          Nieuw Project
        </Link>
      )}

      {isOpen && (
        <div
          className="mx-2 my-2 h-px shrink-0 bg-dark-border"
          aria-hidden
          role="separator"
        />
      )}

      <div
        className={`shrink-0 border-b border-dark-border ${
          isOpen ? 'px-3 py-1.5' : 'flex justify-center py-2'
        }`}
      >
        {isOpen ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-light/45 theme-light:text-light/62">
            Snelle links
          </span>
        ) : (
          <Link
            to="/projects?nieuw=1"
            className="ui-btn ui-btn--primary inline-flex p-2"
            title="Nieuw project"
          >
            <Plus size={16} strokeWidth={2} />
          </Link>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-2">
        {loading ? (
          <>
            <div className="mx-2 mb-2 h-8 animate-pulse rounded bg-dark-card" />
            <div className="mx-2 mb-2 h-8 animate-pulse rounded bg-dark-card" />
            <div className="mx-2 mb-2 h-8 animate-pulse rounded bg-dark-card" />
          </>
        ) : projects.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-2 py-6">
            <Link
              to="/projects?nieuw=1"
              className="text-sm text-accent transition-colors hover:underline"
            >
              + Nieuw project
            </Link>
          </div>
        ) : !isOpen ? (
          <div className="flex flex-col gap-0.5">
            {collapsedList.map(project => (
              <ProjectSidebarRow
                key={project.id}
                project={project}
                isOpen={false}
                activeId={activeId}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className={sectionHeaderClass}>Favorieten</div>
            {favorites.length === 0 ? (
              <p className="text-xs text-light/38 theme-light:text-light/55 px-3 py-1">
                Geen favorieten
              </p>
            ) : (
              favorites.map(project => (
                <ProjectSidebarRow
                  key={project.id}
                  project={project}
                  isOpen
                  activeId={activeId}
                />
              ))
            )}

            <div className={sectionHeaderClass}>Recente projecten</div>
            {recent.map(project => (
              <ProjectSidebarRow
                key={project.id}
                project={project}
                isOpen
                activeId={activeId}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
