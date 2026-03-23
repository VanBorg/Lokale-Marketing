import type { HTMLAttributes } from 'react';

/** Horizontal rule using shared border tokens — tune in `src/styles/ui.css` if needed. */
export default function Separator({ className = '', ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={`border-0 border-t border-dark-border ${className}`.trim()} {...props} />;
}
