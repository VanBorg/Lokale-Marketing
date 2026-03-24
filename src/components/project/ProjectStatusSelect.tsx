import { ChevronDown } from 'lucide-react';
import type { ProjectStatus } from '../../lib/database.types';
import {
  PROJECT_STATUS_DROPDOWN_ORDER,
  PROJECT_STATUS_LABEL_SHORT,
  projectStatusBadgeClass,
} from '../../lib/projectStatusUi';

export interface ProjectStatusSelectProps {
  value: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
  disabled?: boolean;
  /** `sm` = compacte topbalk, `md` = zijpaneel */
  size?: 'sm' | 'md';
  id?: string;
  className?: string;
}

export default function ProjectStatusSelect({
  value,
  onChange,
  disabled,
  size = 'md',
  id,
  className = '',
}: ProjectStatusSelectProps) {
  const sizeClass =
    size === 'sm' ? 'text-[10px] py-0.5 pl-2 pr-6' : 'text-xs py-1 pl-2.5 pr-7';

  return (
    <div className={`relative inline-flex max-w-full shrink-0 items-center ${className}`.trim()}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label="Projectstatus"
        onChange={e => onChange(e.target.value as ProjectStatus)}
        className={`ui-status-select ui-badge max-w-[min(100%,11rem)] cursor-pointer truncate ${sizeClass} ${projectStatusBadgeClass[value]}`}
      >
        {PROJECT_STATUS_DROPDOWN_ORDER.map(s => (
          <option key={s} value={s}>
            {PROJECT_STATUS_LABEL_SHORT[s]}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1 top-1/2 z-[1] -translate-y-1/2 text-current opacity-70"
        size={size === 'sm' ? 12 : 14}
        strokeWidth={2}
        aria-hidden
      />
    </div>
  );
}
