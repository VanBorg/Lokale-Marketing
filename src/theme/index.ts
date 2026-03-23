/**
 * Pixel Blueprint theme — runtime tokens and documentation anchor.
 *
 * **Human-readable spec (do not lose in refactors):** [docs/CRAFTBASE_THEME_REFERENCE.md](../../docs/CRAFTBASE_THEME_REFERENCE.md)
 *
 * **How the stack fits together:**
 * - `src/index.css` — Tailwind layers + CSS variables (`:root` / `.theme-light`) for surfaces that change with dark/light mode (`bg-dark`, `text-light`, `dark-card`, …).
 * - `tailwind.config.js` — Maps those variables to semantic colour names; `brand.*` and `accent` come from `tokens.json`.
 * - `src/hooks/useTheme.ts` — Toggles `theme-light` on `<html>` only (no canvas palette).
 *
 * **In UI components:** prefer Tailwind classes (`bg-dark`, `text-accent`, `border-brand-orange`, …), not raw hex.
 * **In TS (charts, canvas, PDF):** import `brand`, `accentLegacy`, etc. from here.
 */
import tokens from './tokens.json';

export const accentLegacy = tokens.accentLegacy as string;
export const brand = tokens.brand as {
  orange: string;
  orangeLight: string;
  orangeMuted: string;
};
export const semantic = tokens.semantic as {
  success: string;
  error: string;
  warning: string;
};
