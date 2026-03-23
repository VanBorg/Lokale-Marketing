import type { HTMLAttributes } from 'react';

/** Placeholder block; pair with `src/styles/utilities/effects.css` for motion tokens. */
export default function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg bg-dark-border/60 animate-pulse ${className}`.trim()}
      {...props}
    />
  );
}
