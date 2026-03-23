import { DraftingCompass } from 'lucide-react';

interface BlauwdrukMarkIconProps {
  size?: number;
  /** Topbar: strakker kader naast gestapelde titel */
  compact?: boolean;
}

/** Blauwdruk-icoon (passer) — zelfde op topbar en “Blauwdruk maken”-kaart */
export default function BlauwdrukMarkIcon({ size = 24, compact = false }: BlauwdrukMarkIconProps) {
  return (
    <div
      className={`shrink-0 rounded-lg bg-accent/10 text-accent ${compact ? 'p-1.5' : 'p-2'}`.trim()}
    >
      <DraftingCompass size={size} strokeWidth={2} aria-hidden />
    </div>
  );
}
