import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Clock, FileText, FolderKanban, Package, ScanLine } from 'lucide-react';
import BlauwdrukMarkIcon from '../../components/BlauwdrukMarkIcon';

type DashboardCardProps = {
  to: string;
  title: string;
  description: string;
  children: ReactNode;
};

function DashboardCard({ to, title, description, children }: DashboardCardProps) {
  return (
    <Link
      to={to}
      className="group ui-card ui-card--interactive ui-project-card block no-underline text-inherit transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark"
    >
      <div className="ui-project-card__accent-bar" aria-hidden />
      <div className="relative flex items-start gap-3">
        {children}
        <div className="min-w-0 flex-1">
          <h2 className="ui-project-card__title mb-1">{title}</h2>
          <p className="text-xs text-light/50 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

/** Startpagina — snelkoppelingen naar blauwdruk, geplande tools en archief */
export default function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-light">Dashboard</h1>
        <p className="text-light/50 mt-1">
          Kies een module. Blauwdruk is beschikbaar; overige tools volgen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
        <DashboardCard
          to="/projects"
          title="Projecten"
          description="Overzicht van al je projecten."
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <FolderKanban size={22} aria-hidden />
          </div>
        </DashboardCard>

        <DashboardCard
          to="/blauwdruk"
          title="Blauwdruk tool"
          description="Data verzamelen: kamers, maten en materialen. Start met een nieuw project."
        >
          <BlauwdrukMarkIcon size={24} />
        </DashboardCard>

        <DashboardCard
          to="/tools/offerte"
          title="Offerte tool"
          description="Gebruikt blauwdrukdata om PDF-offertes te genereren."
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <FileText size={22} aria-hidden />
          </div>
        </DashboardCard>

        <DashboardCard
          to="/tools/materiaallijst"
          title="Materiaallijst"
          description="Gebruikt blauwdrukdata voor bestellingen en materiaaloverzichten."
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Package size={22} aria-hidden />
          </div>
        </DashboardCard>

        <DashboardCard
          to="/tools/urenregistratie"
          title="Urenregistratie"
          description="Koppelt uren aan je projecten."
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Clock size={22} aria-hidden />
          </div>
        </DashboardCard>

        <DashboardCard
          to="/tools/document-scanner"
          title="Document scanner"
          description="Bonnetjes, facturen en overige documenten."
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <ScanLine size={22} aria-hidden />
          </div>
        </DashboardCard>

        <DashboardCard
          to="/archief"
          title="Archief"
          description="Afgeronde of bewaarde projecten en documenten."
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Archive size={22} aria-hidden />
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
