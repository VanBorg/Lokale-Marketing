import { NavLink } from 'react-router-dom';
import { User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'A1 Offerte Generator', path: '/a1-offerte' },
];

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-dark border-b border-dark-border flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <span className="text-lg font-bold text-accent tracking-tight">
          Craftbase
        </span>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-light/60 hover:text-light hover:bg-dark-card'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-light/50 hover:text-light hover:bg-dark-card transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="flex items-center gap-2 text-sm text-light/70">
          <User size={16} />
          <span>Gebruiker</span>
        </div>
      </div>
    </header>
  );
}
