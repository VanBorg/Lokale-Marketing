import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  /** Brand accent border (e.g. primary module card on dashboard). */
  selected?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = '',
  hover = false,
  selected = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={`
        ui-card
        ${selected ? 'ui-card--selected' : ''}
        ${hover ? 'ui-card--interactive' : ''}
        ${className}
      `.trim()}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
