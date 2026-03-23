import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/** Mirrors `Input` layout; field styles live in `src/styles/components/forms.css` (add `.ui-textarea` when you split from `.ui-input`). */
export default function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="ui-label">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`ui-input min-h-[100px] resize-y ${error ? 'ui-input--error' : ''} ${className}`.trim()}
        {...props}
      />
      {error && <p className="ui-field-error">{error}</p>}
    </div>
  );
}
