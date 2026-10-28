import { CircleAlert, CircleCheck, Info } from 'lucide-react';

const VARIANTS = {
  error: {
    icon: CircleAlert,
    className: 'bg-danger-soft/40 border-danger/30 text-danger',
    role: 'alert',
  },
  success: {
    icon: CircleCheck,
    className: 'bg-success-soft border-success-line text-success-strong',
    role: 'status',
  },
  info: {
    icon: Info,
    className: 'bg-surface border-line text-subtle',
    role: 'status',
  },
};

export function Alert({ variant = 'error', children, className = '' }) {
  const { icon: Icon, className: tone, role } = VARIANTS[variant];
  return (
    <div
      role={role}
      className={`flex items-start gap-2.5 rounded border p-3 text-xs leading-relaxed ${tone} ${className}`}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
