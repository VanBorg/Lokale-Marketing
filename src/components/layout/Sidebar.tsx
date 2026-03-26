import { Link, useMatch, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import type { Project, ProjectStatus } from '../../lib/database.types';
import { projectStatusSidebarDotClass } from '../../lib/projectStatusUi';

function statusDotClass(status: ProjectStatus): string {
  return projectStatusSidebarDotClass[status];
}

function sortByUpdatedDesc(a: Project, b: Project) {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

const sectionHeaderClass =
  'px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 theme-light:text-neutral-500';

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
            className={`truncate text-xs ${isActive ? 'text-accent/80' : 'text-neutral-500 theme-light:text-neutral-500'}`}
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
  const isDashboardRoute = !!useMatch('/dashboard');
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
      {/* Dashboard: collapse/expand sidebar. Other routes: back to dashboard. */}
      {isDashboardRoute ? (
        <button
          type="button"
          onClick={onToggle}
          title={isOpen ? 'Zijbalk inklappen' : 'Zijbalk uitklappen'}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Zijbalk inklappen' : 'Zijbalk uitklappen'}
          className="ui-sidebar-toggle"
        >
          {isOpen ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          title="Terug naar Dashboard"
          aria-label="Terug naar Dashboard"
          className={`ui-sidebar-toggle ${isOpen ? 'justify-start gap-2 px-3' : ''}`}
        >
          <ArrowLeft size={16} />
          {isOpen ? (
            <span className="text-sm font-medium text-neutral-300 theme-light:text-neutral-600">Terug</span>
          ) : null}
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
          className="mx-2 my-2 h-px shrink-0 bg-neutral-800 theme-light:bg-neutral-200"
          aria-hidden
          role="separator"
        />
      )}

      <div
        className={`shrink-0 border-b border-neutral-800 theme-light:border-neutral-200 ${
          isOpen ? 'px-3 py-1.5' : 'flex justify-center py-2'
        }`}
      >
        {isOpen ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 theme-light:text-neutral-500">
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
            <div className="mx-2 mb-2 h-8 animate-pulse rounded bg-neutral-800 theme-light:bg-neutral-200" />
            <div className="mx-2 mb-2 h-8 animate-pulse rounded bg-neutral-800 theme-light:bg-neutral-200" />
            <div className="mx-2 mb-2 h-8 animate-pulse rounded bg-neutral-800 theme-light:bg-neutral-200" />
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
              <p className="px-3 py-1 text-xs text-neutral-500 theme-light:text-neutral-500">
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
