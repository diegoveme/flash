export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-dashed border-line bg-surface px-6 py-20 text-center ${className}`}
    >
      {Icon && (
        <Icon className="mx-auto mb-3 h-10 w-10 stroke-[1.5] text-faint" aria-hidden="true" />
      )}
      <h3 className="font-headline text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
