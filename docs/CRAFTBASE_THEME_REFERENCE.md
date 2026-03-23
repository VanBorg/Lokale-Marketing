# Pixel Blueprint Design & Theme Reference

> Dit document bewaart het volledige design/thema van Pixel Blueprint zodat het later opnieuw toegepast kan worden. NIETS hiervan mag verloren gaan bij refactors.

---

## 1. Kleurenpalet

### Dark Mode (primair)
| Rol | Kleur | Gebruik |
|-----|-------|---------|
| Background (body) | `#121212` / `bg-neutral-950` | Achtergrond van de hele app |
| Surface / Cards | `#1E1E1E` / `bg-neutral-900` | Kaarten, sidebar, panels |
| Surface hover | `#2A2A2A` / `bg-neutral-800` | Hover states op kaarten |
| Border default | `#333333` / `border-neutral-700` | Subtiele randen op kaarten |
| Border active/selected | `#35B4D3` / `border-accent` | Actieve kaart (bijv. A1 Offerte geselecteerd) |
| Text primary | `#FFFFFF` / `text-white` | Titels, bold labels |
| Text secondary | `#A3A3A3` / `text-neutral-400` | Subtekst, beschrijvingen |
| Text muted | `#737373` / `text-neutral-500` | Labels zoals "A1", "B2" |

### Accent Kleuren
| Rol | Kleur | Gebruik |
|-----|-------|---------|
| Primary accent | `#35B4D3` / blauw accent | Iconen, actieve borders, logo, knoppen |
| Primary hover | `#62CBE5` / lichter blauw | Hover state op accent-elementen |
| Primary muted/bg | `rgba(53, 180, 211, 0.1)` | Subtiele accent-achtergrond op icoon-cirkels |
| Success | `#22C55E` | Succes meldingen |
| Error | `#EF4444` | Foutmeldingen |
| Warning | `#F59E0B` | Waarschuwingen |

### Light Mode
| Rol | Kleur |
|-----|-------|
| Background | `#F5F5F5` / `bg-neutral-100` |
| Surface | `#FFFFFF` / `bg-white` |
| Border | `#E5E5E5` / `border-neutral-200` |
| Text primary | `#171717` / `text-neutral-900` |
| Text secondary | `#525252` / `text-neutral-600` |
| Accent blijft | `#35B4D3` (blauw accent) |

---

## 2. Typografie

| Element | Stijl |
|---------|-------|
| Font family | `Inter` (of system sans-serif fallback) |
| Logo "Pixel Blueprint" | Bold, accent `#35B4D3`, ~20px |
| Page title ("Welkom bij Pixel Blueprint") | `text-2xl font-bold text-white` |
| Page subtitle | `text-base text-neutral-400` |
| Card title ("Offerte") | `text-lg font-bold text-white` |
| Card subtitle/description | `text-sm text-neutral-400` |
| Card label ("A1") | `text-xs text-neutral-500 font-medium` |
| Sidebar section header | `text-xs font-semibold uppercase tracking-wider text-neutral-500` |
| Sidebar item | `text-sm text-neutral-300` |
| Sidebar item active | `text-sm text-accent font-medium` |
| Top nav items | `text-sm text-neutral-300` |
| Top nav active (Dashboard badge) | `text-sm bg-accent text-white rounded-md px-3 py-1` |

---

## 3. Component Styles

### Top Navigation Bar
- Hoogte: ~56px
- Achtergrond: `bg-neutral-950` met subtiele bottom border `border-neutral-800`
- Links: "Pixel Blueprint" logo (accent, bold) → "Dashboard" (accent badge/pill) → breadcrumb items (grijs)
- Rechts: Light/dark toggle icoon → "Gebruiker" met user icoon
- Vast bovenaan (sticky)

### Sidebar
- Breedte: ~240px
- Achtergrond: `bg-neutral-950`
- Inklapbaar met chevron (`<`) knop
- Secties met headers: "OFFERTE & INKOOP" en "DOCUMENT SCANNER"
- Items met icoon + tekst
- Actief item: accentkleur tekst
- Scheidingslijn tussen secties: `border-neutral-800`

### Module Cards (Dashboard)
- Layout: 2 rijen van 4 kaarten (grid `grid-cols-4 gap-4`)
- Kaart: `bg-neutral-900 rounded-xl border border-neutral-700 p-6`
- Hover: `border-neutral-600` of lichte achtergrond lift
- Actief/geselecteerd: `border-accent` (accentrand)
- Icoon: 48x48px cirkel met accent icon, subtiele accent-achtergrond
- Tekst layout: Label (A1) boven titel, beschrijving eronder
- Rij 1 border: accent tint (actieve module)
- Rij 2 border: subtielere accent tint

### Buttons
- Primary: `bg-accent hover:bg-accent/90 text-white rounded-lg px-4 py-2`
- Secondary: `bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg px-4 py-2 border border-neutral-600`
- Ghost: `text-neutral-400 hover:text-white`

### Dark/Light Toggle
- Icoon-gebaseerd (zon/maan)
- Positie: rechtsboven in de topbar
- Schakelt volledig kleurenschema

---

## 4. Layout & Spacing

| Element | Waarde |
|---------|--------|
| Page padding | `p-8` (32px) |
| Card gap | `gap-4` (16px) |
| Card padding | `p-6` (24px) |
| Card border-radius | `rounded-xl` (12px) |
| Sidebar width | `w-60` (240px) |
| Topbar height | `h-14` (56px) |
| Icon size (cards) | `w-12 h-12` (48px) |

---

## 5. Iconen

- Stijl: Outline/stroke iconen (Lucide React of vergelijkbaar)
- Kleur: `text-accent` (`#35B4D3`)
- Grootte in cards: 24px binnenin 48px cirkel
- Achtergrond cirkel: `bg-accent/10 rounded-full`

---

## 6. Tailwind Config Notities

- Gebruik Tailwind CSS **v3** (NIET v4)
- Custom kleuren in `tailwind.config.js`:
  ```
  colors: {
    accent: '#35B4D3', // uit tokens.json (accentLegacy)
    brand: {
      orange: '#35B4D3',
      'orange-light': '#62CBE5',
      'orange-muted': 'rgba(53, 180, 211, 0.1)',
    }
  }
  ```
- Dark mode strategy: `class` based (handmatige toggle)

---

## 7. Interactie Patronen

- Cards zijn klikbaar → navigeren naar module
- Hover op cards: subtiele border kleurverandering + lichte achtergrond lift
- Sidebar items: hover = lichtere tekst, klik = accent + navigatie
- Smooth transitions: `transition-all duration-200`
- Dashboard badge "Dashboard": altijd zichtbaar als je op dashboard bent

---

## 8. Referentie Screenshots

Zie de bijgevoegde screenshots in het project voor visuele referentie:
- Dashboard overview (full width met sidebar)
- Dashboard cards close-up (kaart details en spacing)

---

## 9. Implementatie in deze codebase (niet overschrijven zonder reden)

| Laag | Bestand | Rol |
|------|---------|-----|
| Vaste hex / brand | `src/theme/tokens.json` | Enige bron voor `accentLegacy`, `brand.*`, statuskleuren; Tailwind leest dit via `tailwind.config.js`. |
| TS-import | `src/theme/index.ts` | `import { brand, accentLegacy } from '../theme'` voor canvas/charts/API’s — niet voor gewone JSX (daar Tailwind). |
| Dark/light surfaces | `src/index.css` | CSS-variabelen `--color-bg`, `--color-text`, `--color-card`, … + klasse `.theme-light`. |
| Semantische Tailwind-kleuren | `tailwind.config.js` | `bg-dark`, `text-light`, `accent`, `brand-orange`, `dark-card`, … |
| Class-toggle | `src/hooks/useTheme.ts` | Zet `theme-light` op `<html>`. |

**UI-primitieven:** `src/components/ui/` — barrel export via `src/components/ui/index.ts`.
