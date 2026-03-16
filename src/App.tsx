import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Login from './pages/auth/Login';
import OfferteGenerator from './pages/a1-offerte/OfferteGenerator';

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="a1-offerte" element={<OfferteGenerator />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
