import { useId } from 'react';

/**
 * Labeled input with an optional leading icon, hint and error message.
 * Extra props go straight to the <input>.
 */
export function TextField({ label, icon: Icon, hint, error, className = '', ...inputProps }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-faint"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`field py-2.5 pr-3 ${Icon ? 'pl-9' : 'pl-3'}`}
          {...inputProps}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[11px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-[10px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
