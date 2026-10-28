import { initialsFor, stableIndex } from '../lib/format/avatar.js';

const TONES = [
  'bg-primary-soft text-primary-hover',
  'bg-inspire-soft text-inspire',
  'bg-danger-soft text-danger',
  'bg-success-soft text-success',
  'bg-surface-raised text-ink',
];

const SIZES = {
  xs: 'w-4 h-4 text-[7px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-20 h-20 text-xl',
};

/**
 * Initials avatar. The MVP has no profile pictures, so the color is derived
 * from the username and stays the same everywhere.
 */
export function Avatar({ username, size = 'sm', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong font-headline font-bold tracking-tight select-none ${SIZES[size]} ${TONES[stableIndex(username, TONES.length)]} ${className}`}
    >
      {initialsFor(username)}
    </span>
  );
}
