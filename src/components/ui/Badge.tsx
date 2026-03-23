import type { HTMLAttributes } from 'react';

/** Thin wrapper around `.ui-badge` tokens — extend variants in `src/styles/components/badges.css`. */
export default function Badge({ className = '', children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`ui-badge ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}
