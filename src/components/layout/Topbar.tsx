import { Link } from 'react-router-dom';
import { User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import BlauwdrukMarkIcon from '../BlauwdrukMarkIcon';
import Breadcrumb from './Breadcrumb';

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="ui-topbar">
      <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
        <Link
          to="/dashboard"
          className="flex shrink-0 items-center gap-1 no-underline text-inherit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 theme-light:focus-visible:ring-offset-white"
          title="Pixel Blueprint — Dashboard"
        >
          <BlauwdrukMarkIcon size={22} compact />
          <div className="flex flex-col">
            <span className="block text-lg font-bold leading-none text-accent tracking-tight">
              Pixel
            </span>
            <span className="-mt-2 block text-lg font-bold leading-none text-accent tracking-tight">
              Blueprint
            </span>
          </div>
        </Link>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="ui-icon-button"
          title={theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="ui-topbar-user">
          <User size={16} />
          <span>Gebruiker</span>
        </div>
      </div>
    </header>
  );
}
