import { LoaderCircle } from 'lucide-react';

export function Spinner({ label = 'Loading', className = '' }) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 text-xs text-muted ${className}`}
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

/** Centered spinner for a whole screen or section. */
export function LoadingState({ label }) {
  return (
    <div className="flex justify-center py-24">
      <Spinner label={label} />
    </div>
  );
}
