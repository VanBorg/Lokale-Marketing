import { NavLink } from 'react-router-dom';
import { User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="ui-topbar">
      <div className="flex items-center gap-8">
        <span className="ui-brand-wordmark">Pixel Blueprint</span>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={({ isActive }) => `ui-nav-pill ${isActive ? 'ui-nav-pill--active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" end className={({ isActive }) => `ui-nav-pill ${isActive ? 'ui-nav-pill--active' : ''}`}>
            Projecten
          </NavLink>
        </nav>
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
