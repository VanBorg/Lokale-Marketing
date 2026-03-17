import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

export default function Layout() {
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

  return (
    <div className="min-h-screen bg-dark">
      <Topbar />
      <Sidebar isOpen={sidebarOpen} onToggle={toggle} />
      <main className={`${sidebarOpen ? 'ml-64' : 'ml-12'} pt-14 min-h-screen transition-all duration-200`}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
