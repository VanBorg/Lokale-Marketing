import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useProjectName } from '../../hooks/useProjectName';

type Crumb = { label: string; to?: string };

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const { id } = useParams();
  const projectName = useProjectName(id);

  const crumbs: Crumb[] = [];

  if (pathname === '/dashboard') {
    crumbs.push({ label: 'Dashboard' });
  } else if (pathname === '/projects') {
    crumbs.push({ label: 'Dashboard', to: '/dashboard' });
    crumbs.push({ label: 'Projecten' });
  } else if (pathname === '/blauwdruk') {
    crumbs.push({ label: 'Dashboard', to: '/dashboard' });
    crumbs.push({ label: 'Blauwdruk tool' });
  } else if (pathname.startsWith('/project/') && id) {
    crumbs.push({ label: 'Dashboard', to: '/dashboard' });
    crumbs.push({ label: 'Projecten', to: '/projects' });
    crumbs.push({ label: projectName ?? 'Project' });
  } else if (pathname === '/archief') {
    crumbs.push({ label: 'Dashboard', to: '/dashboard' });
    crumbs.push({ label: 'Archief' });
  } else if (pathname.startsWith('/tools/')) {
    const toolLabels: Record<string, string> = {
      offerte: 'Offerte tool',
      materiaallijst: 'Materiaallijst',
      urenregistratie: 'Urenregistratie',
      'document-scanner': 'Document scanner',
    };
    const segment = pathname.replace(/^\/tools\//, '');
    const label = toolLabels[segment];
    if (label) {
      crumbs.push({ label: 'Dashboard', to: '/dashboard' });
      crumbs.push({ label });
    } else {
      return null;
    }
  } else {
    return null;
  }

  return (
    <nav
      className="flex min-w-0 max-w-md flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-light/40"
      aria-label="Broodkruimel"
    >
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight size={13} className="shrink-0 text-light/25" aria-hidden />}
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="shrink-0 border-b border-transparent pb-0.5 transition-colors hover:text-light"
            >
              {crumb.label}
            </Link>
          ) : (
            <span
              className="truncate border-b border-accent pb-0.5 font-medium text-light/85"
              aria-current="page"
            >
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
