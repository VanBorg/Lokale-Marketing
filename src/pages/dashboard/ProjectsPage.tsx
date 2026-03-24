import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useProjects } from '../../hooks/useProjects';
import type { ProjectStatus } from '../../lib/database.types';
import {
  PROJECT_STATUS_LABEL_SHORT,
  PROJECT_STATUS_STATS_ORDER,
  projectStatusBadgeClass,
  projectStatusStatChipClass,
} from '../../lib/projectStatusUi';
import ProjectCard from './ProjectCard';
import NewProjectDialog from './NewProjectDialog';

/** Projecten overzicht — zie ui.css: .ui-projects-summary, .ui-stat-chip--status-* */
export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, loading, createProject, toggleFavorite } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  /** Laatst gekozen status staat vooraan (index 0) voor de tagrij. */
  const [filterOrder, setFilterOrder] = useState<ProjectStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const toggleStatusFilter = (status: ProjectStatus) => {
    setFilterOrder(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      }
      return [status, ...prev.filter(s => s !== status)];
    });
  };

  const removeStatusFilter = (status: ProjectStatus) => {
    setFilterOrder(prev => prev.filter(s => s !== status));
  };

  const clearFilters = () => setFilterOrder([]);

  const clearSearch = () => setSearchQuery('');

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (filterOrder.length > 0) {
      const allowed = new Set(filterOrder);
      list = list.filter(p => allowed.has(p.status));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(p => {
        const name = (p.name ?? '').toLowerCase();
        const client = (p.client_name ?? '').toLowerCase();
        const address = (p.client_address ?? '').toLowerCase();
        return name.includes(q) || client.includes(q) || address.includes(q);
      });
    }
    return list;
  }, [projects, filterOrder, searchQuery]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  return (
    <div>
      <div className="ui-projects-summary">
        <div className="ui-projects-summary__layout">
          <div className="ui-projects-summary__title">
            <h1 className="text-xl font-bold text-light sm:text-2xl">Alle Projecten</h1>
            <p className="mt-0.5 text-sm text-light/50">Overzicht van al je projecten</p>
          </div>

          <div className="ui-projects-summary__stats">
            <button
              type="button"
              onClick={clearFilters}
              title="Toon alle projecten"
              aria-pressed={filterOrder.length === 0}
              className={`ui-stat-chip ui-stat-chip--primary text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                filterOrder.length === 0 ? 'ring-2 ring-accent/45' : 'opacity-85 hover:opacity-100'
              }`}
            >
              <p className="ui-stat-chip__value">{projects.length}</p>
              <p className="ui-stat-chip__label">Totaal</p>
            </button>
            {PROJECT_STATUS_STATS_ORDER.map(status => {
              const count = projects.filter(p => p.status === status).length;
              const selected = filterOrder.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatusFilter(status)}
                  title={`Filter: ${PROJECT_STATUS_LABEL_SHORT[status]}`}
                  aria-pressed={selected}
                  className={`ui-stat-chip ${projectStatusStatChipClass[status]} text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                    selected ? 'ring-2 ring-accent/50' : ''
                  }`}
                >
                  <p className="ui-stat-chip__value">{count}</p>
                  <p className="ui-stat-chip__label">{PROJECT_STATUS_LABEL_SHORT[status]}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ui-projects-summary__search">
          <label htmlFor="projects-search" className="sr-only">
            Zoek projecten op naam, klant of locatie
          </label>
          <div className="ui-projects-search">
            <Search className="ui-projects-search__icon" size={18} strokeWidth={2} aria-hidden />
            <input
              id="projects-search"
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Zoek op projectnaam, klant of adres…"
              autoComplete="off"
              spellCheck={false}
              className="ui-input w-full min-w-0 py-2.5 pl-10 pr-10 text-sm transition-all duration-200"
            />
            {hasActiveSearch ? (
              <button
                type="button"
                onClick={clearSearch}
                className="ui-projects-search__clear"
                title="Zoekveld leegmaken"
                aria-label="Zoekveld leegmaken"
              >
                <X size={16} strokeWidth={2} />
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-light/38 theme-light:text-light/50">
            Doorzoekt projectnaam, klantnaam en adres (locatie).
          </p>
        </div>
      </div>

      {filterOrder.length > 0 && (
        <div
          className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-dark-border bg-dark-card/60 px-3 py-2.5 transition-all duration-200"
          role="status"
          aria-label="Actieve statusfilters"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
            Actieve filters
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {filterOrder.map(status => (
              <button
                key={status}
                type="button"
                onClick={() => removeStatusFilter(status)}
                title={`${PROJECT_STATUS_LABEL_SHORT[status]} verwijderen`}
                className={`ui-badge inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pl-2 pr-1 transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${projectStatusBadgeClass[status]}`}
              >
                <span className="truncate">{PROJECT_STATUS_LABEL_SHORT[status]}</span>
                <span className="inline-flex rounded-full p-0.5 text-current hover:bg-light/10">
                  <X size={12} strokeWidth={2.5} aria-hidden />
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 text-xs font-medium text-accent transition-colors duration-200 hover:underline"
          >
            Alles wissen
          </button>
        </div>
      )}

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
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-dark-border bg-dark-card/40 py-14 text-center">
          <p className="text-light/50 mb-2">Geen projecten gevonden.</p>
          <p className="text-xs text-light/35 mb-5 max-w-sm mx-auto">
            {hasActiveSearch && filterOrder.length > 0
              ? 'Pas je zoekterm aan of wijzig de statusfilters.'
              : hasActiveSearch
                ? 'Geen match op projectnaam, klant of adres.'
                : 'Geen projecten met de gekozen statusfilters.'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearSearch();
              clearFilters();
            }}
          >
            {hasActiveSearch && filterOrder.length > 0
              ? 'Zoeken en filters wissen'
              : hasActiveSearch
                ? 'Zoekveld leegmaken'
                : 'Filters wissen'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProjects.map(project => (
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
