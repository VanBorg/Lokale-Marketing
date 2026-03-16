import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';

type Theme = 'dark' | 'light';

interface CanvasColors {
  stageBg: string;
  roomFill: string;
  roomStroke: string;
  roomStrokeSelected: string;
  gridThin: string;
  gridThick: string;
  text: string;
  textSelected: string;
  wallNumber: string;
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  canvasColors: CanvasColors;
}

const DARK_CANVAS: CanvasColors = {
  stageBg: '#0E0E0E',
  roomFill: '#1F1F1F',
  roomStroke: 'rgba(255,255,255,0.22)',
  roomStrokeSelected: '#FF5C1A',
  gridThin: 'rgba(255,255,255,0.03)',
  gridThick: 'rgba(255,255,255,0.07)',
  text: '#F0EDE8',
  textSelected: '#FF5C1A',
  wallNumber: '#888',
};

const LIGHT_CANVAS: CanvasColors = {
  stageBg: '#FAFAFA',
  roomFill: '#F2F2F2',
  roomStroke: 'rgba(0,0,0,0.22)',
  roomStrokeSelected: '#FF5C1A',
  gridThin: 'rgba(0,0,0,0.06)',
  gridThick: 'rgba(0,0,0,0.12)',
  text: '#1A1A1A',
  textSelected: '#FF5C1A',
  wallNumber: '#999',
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  canvasColors: DARK_CANVAS,
});

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.remove('theme-light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const canvasColors = useMemo(
    () => (theme === 'dark' ? DARK_CANVAS : LIGHT_CANVAS),
    [theme],
  );

  const value = useMemo(
    () => ({ theme, toggleTheme, canvasColors }),
    [theme, toggleTheme, canvasColors],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}
