import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FileText,
  Receipt,
  CalendarDays,
  Clock,
  ShoppingCart,
  Package,
  Truck,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MenuItem {
  code: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const moduleA: MenuItem[] = [
  { code: 'A1', label: 'Offerte Generator', path: '/a1-offerte', icon: <FileText size={16} /> },
  { code: 'A2', label: 'Prijzen Leveranciers', path: '/a2-factuur', icon: <Receipt size={16} /> },
  { code: 'A3', label: 'Materiaallijst', path: '/a3-planning', icon: <CalendarDays size={16} /> },
  { code: 'A4', label: 'Bestelautomaat', path: '/a4-uren', icon: <Clock size={16} /> },
];

const moduleB: MenuItem[] = [
  { code: 'B1', label: 'Werkbriefjes', path: '/b1-inkoop', icon: <ShoppingCart size={16} /> },
  { code: 'B2', label: 'Bonnetjes & Facturen', path: '/b2-voorraad', icon: <Package size={16} /> },
  { code: 'B3', label: 'Onderaannemers', path: '/b3-materieel', icon: <Truck size={16} /> },
  { code: 'B4', label: 'Contracten', path: '/b4-kwaliteit', icon: <ShieldCheck size={16} /> },
];

function ModuleGroup({ title, items, defaultOpen = true }: { title: string; items: MenuItem[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-light/40 hover:text-light/60 transition-colors"
      >
        {title}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-light/60 hover:text-light hover:bg-dark-card'
                }`
              }
            >
              {item.icon}
              <span className="text-light/40 font-mono text-xs">{item.code}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-14 bottom-0 bg-dark border-r border-dark-border transition-all duration-200 overflow-hidden flex flex-col ${
        isOpen ? 'w-64' : 'w-12'
      }`}
    >
      {/* Toggle button – always visible at the top */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Sidebar verbergen' : 'Sidebar tonen'}
        className="shrink-0 flex items-center justify-center h-10 w-full border-b border-dark-border text-light/40 hover:text-light hover:bg-dark-card transition-colors cursor-pointer"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Nav content – shown only when expanded */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto py-4">
          <ModuleGroup title="Offerte & Inkoop" items={moduleA} />
          <ModuleGroup title="Document Scanner" items={moduleB} />
        </div>
      )}
    </aside>
  );
}
