import { useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

export default function Layout() {
  const isProjectPage = !!useMatch('/project/:id');

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar-open') !== 'false'; } catch { return true; }
  });

  const toggle = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar-open', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const mainClass = [
    'ui-shell-main',
    isProjectPage && 'ui-shell-main--flush',
    !isProjectPage && (sidebarOpen ? 'ui-shell-main--sidebar-open' : 'ui-shell-main--sidebar-collapsed'),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="ui-shell">
      <Topbar />
      {!isProjectPage && <Sidebar isOpen={sidebarOpen} onToggle={toggle} />}
      <main className={mainClass}>
        {isProjectPage ? (
          <Outlet />
        ) : (
          <div className="ui-page-padding">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
