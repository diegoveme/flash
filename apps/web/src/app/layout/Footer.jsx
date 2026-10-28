export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface py-8 text-xs text-muted">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="font-headline text-sm font-extrabold tracking-tight text-ink">
            FLASH
          </span>
          <span className="text-line-strong" aria-hidden="true">
            |
          </span>
          <span>Photography community space</span>
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
          <li>GPS always removed</li>
          <li aria-hidden="true">·</li>
          <li>Newest first</li>
          <li aria-hidden="true">·</li>
          <li>24h sessions</li>
        </ul>
      </div>
    </footer>
  );
}
