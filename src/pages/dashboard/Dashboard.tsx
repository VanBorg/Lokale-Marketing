import { Link } from 'react-router-dom';
import { Archive } from 'lucide-react';
import BlauwdrukMarkIcon from '../../components/BlauwdrukMarkIcon';

/** Startpagina — hele kaart = knop naar projecten of archief */
export default function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-light">Dashboard</h1>
        <p className="text-light/50 mt-1">
          Welkom bij Pixel Blueprint. Kies waar je naartoe wilt: een nieuwe of bestaande blauwdruk, of je archief.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <Link
          to="/projects"
          className="group ui-card ui-card--interactive ui-project-card block no-underline text-inherit transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark"
        >
          <div className="ui-project-card__accent-bar" aria-hidden />
          <div className="relative flex items-start gap-3">
            <BlauwdrukMarkIcon size={24} />
            <div className="min-w-0 flex-1">
              <h2 className="ui-project-card__title mb-1">Maak een blauwdruk</h2>
              <p className="text-xs text-light/50 leading-relaxed">
                Ga naar je projecten, open er een en werk in de maker verder aan plattegronden, kamers en muren.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/archief"
          className="group ui-card ui-card--interactive ui-project-card block no-underline text-inherit transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark"
        >
          <div className="ui-project-card__accent-bar" aria-hidden />
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Archive size={24} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="ui-project-card__title mb-1">Archief</h2>
              <p className="text-xs text-light/50 leading-relaxed">
                Bekijk afgeronde of bewaarde projecten en documenten.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
