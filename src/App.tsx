import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/layout/Layout';

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Login = lazy(() => import('./pages/auth/Login'));
const OfferteGenerator = lazy(() => import('./pages/a1-offerte/OfferteGenerator'));

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
              <Route path="a1-offerte" element={<OfferteGenerator />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
