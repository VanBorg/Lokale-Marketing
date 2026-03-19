import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';

type Theme = 'dark' | 'light';

export interface CanvasColors {
  stageBg: string;
  roomFill: string;
  /** Finalized special rooms: solid fill (same for dark/light) */
  specialFinalizedFill: string;
  roomStroke: string;
  roomStrokeSelected: string;
  gridThin: string;
  gridThick: string;
  text: string;
  textSelected: string;
  wallNumber: string;
  /** Dimension lines on canvas - visible on both light and dark stage */
  dimensionLine: string;
  dimensionLabelBg: string;
  dimensionLabelText: string;
  /** Unselected element outline on room */
  elementStrokeUnselected: string;
  /** Resize handle stroke (around orange fill) */
  handleStroke: string;
  /** Sub-room fill (theme-dependent) */
  subRoomFill: string;
  /** Sub-room stroke (theme-dependent) */
  subRoomStroke: string;
  /** Finalized room: diagonal stripe colour (same for all finalized rooms, dark/light) */
  finalizedRoomStripe: string;
  /** Finalized room: stripe line width */
  finalizedRoomStripeLineWidth: number;
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  canvasColors: CanvasColors;
}

const FINALIZED_STRIPE_COLOR = 'rgba(134, 239, 172, 0.45)';
const FINALIZED_STRIPE_LINE_WIDTH = 4;
const SPECIAL_FINALIZED_FILL_LIGHT = '#CDEEDD';
const SPECIAL_FINALIZED_FILL_DARK = '#1E3D2B';

const DARK_CANVAS: CanvasColors = {
  stageBg: '#0E0E0E',
  roomFill: '#1F1F1F',
  specialFinalizedFill: SPECIAL_FINALIZED_FILL_DARK,
  roomStroke: 'rgba(255,255,255,0.22)',
  roomStrokeSelected: '#FF5C1A',
  gridThin: 'rgba(255,255,255,0.12)',
  gridThick: 'rgba(255,255,255,0.22)',
  text: '#F0EDE8',
  textSelected: '#FF5C1A',
  wallNumber: '#888',
  dimensionLine: '#888',
  dimensionLabelBg: 'rgba(0,0,0,0.6)',
  dimensionLabelText: '#e0e0e0',
  elementStrokeUnselected: 'rgba(255,255,255,0.4)',
  handleStroke: '#fff',
  subRoomFill: '#232222',
  subRoomStroke: '#FF5C1A',
  finalizedRoomStripe: FINALIZED_STRIPE_COLOR,
  finalizedRoomStripeLineWidth: FINALIZED_STRIPE_LINE_WIDTH,
};

const LIGHT_CANVAS: CanvasColors = {
  stageBg: '#FAFAFA',
  roomFill: '#EBEBEB',
  specialFinalizedFill: SPECIAL_FINALIZED_FILL_LIGHT,
  roomStroke: 'rgba(0,0,0,0.38)',
  roomStrokeSelected: '#FF5C1A',
  gridThin: 'rgba(0,0,0,0.14)',
  gridThick: 'rgba(0,0,0,0.24)',
  text: '#1A1A1A',
  textSelected: '#FF5C1A',
  wallNumber: '#555',
  dimensionLine: '#444',
  dimensionLabelBg: 'rgba(255,255,255,0.98)',
  dimensionLabelText: '#1a1a1a',
  elementStrokeUnselected: 'rgba(0,0,0,0.35)',
  handleStroke: '#333',
  subRoomFill: '#E4E2E0',
  subRoomStroke: '#E85A1A',
  finalizedRoomStripe: FINALIZED_STRIPE_COLOR,
  finalizedRoomStripeLineWidth: FINALIZED_STRIPE_LINE_WIDTH,
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
    document.documentElement.classList.add('disable-transitions');
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('disable-transitions');
      });
    });
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
