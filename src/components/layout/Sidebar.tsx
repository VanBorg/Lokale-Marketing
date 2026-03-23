import { NavLink } from 'react-router-dom';
import { FolderKanban, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <aside
      className={`ui-sidebar ${isOpen ? 'ui-sidebar--open' : 'ui-sidebar--collapsed'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        title={isOpen ? 'Sidebar verbergen' : 'Sidebar tonen'}
        className="ui-sidebar-toggle"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <nav className="flex-1 overflow-y-auto py-4">
        <NavLink
          to="/projects"
          end
          className={({ isActive }) =>
            `ui-sidebar-link ${isActive ? 'ui-sidebar-link--active' : ''}`
          }
        >
          <FolderKanban size={16} className="shrink-0" />
          {isOpen && <span>Projecten</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
