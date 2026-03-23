import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/layout/Layout';

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const ProjectsPage = lazy(() => import('./pages/dashboard/ProjectsPage'));
const ArchiefPlaceholder = lazy(() => import('./pages/archief/ArchiefPlaceholder'));
const Login = lazy(() => import('./pages/auth/Login'));
const ProjectDetail = lazy(() => import('./pages/project/ProjectDetail'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div
        className="h-8 w-8 rounded-full border-2 border-dark-border border-t-accent animate-spin"
        aria-label="Laden"
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="archief" element={<ArchiefPlaceholder />} />
              <Route path="project/:id" element={<ProjectDetail />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
