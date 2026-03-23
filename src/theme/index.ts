/**
 * Pixel Blueprint theme — runtime tokens and documentation anchor.
 *
 * **Human-readable spec (do not lose in refactors):** [docs/CRAFTBASE_THEME_REFERENCE.md](../../docs/CRAFTBASE_THEME_REFERENCE.md)
 *
 * **How the stack fits together:**
 * - `src/index.css` — Tailwind entry: layers + imports `styles/tokens.css` and `styles/ui.css`.
 * - `src/styles/tokens.css` — `:root` / `.theme-light` surface variables and `--ui-*` tokens (radius, motion).
 * - `src/styles/ui.css` — Reusable `.ui-*` classes (buttons, cards, forms, badges, shell, motion helpers) via `@apply`.
 * - `tailwind.config.js` — Maps CSS variables to semantic colour names; `brand.*` and `accent` come from `tokens.json`.
 * - `src/hooks/useTheme.ts` — Toggles `theme-light` on `<html>` only (no canvas palette).
 *
 * **In UI components:** prefer shared `.ui-*` classes from `styles/ui.css`, then Tailwind utilities (`bg-dark`, `text-accent`, …), not raw hex.
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
