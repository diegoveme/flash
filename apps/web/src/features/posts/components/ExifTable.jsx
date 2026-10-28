import { Camera, ShieldCheck } from 'lucide-react';
import { EXIF_FIELDS } from '@flash/shared';

const EMPTY_VALUE = 'n/a';

/** Technical metadata table. Values come from the API, which never stores GPS. */
export function ExifTable({ exif = {} }) {
  const hasData = EXIF_FIELDS.some(({ key }) => exif[key]);

  return (
    <section className="rounded-lg border border-line bg-canvas p-5" aria-labelledby="exif-title">
      <div className="flex items-center justify-between border-b border-line pb-3.5">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3
            id="exif-title"
            className="font-headline text-sm font-semibold tracking-wider text-ink uppercase"
          >
            Technical EXIF data
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-[2px] border border-success-line bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          GPS removed
        </span>
      </div>

      {hasData ? (
        <dl className="divide-y divide-line">
          {EXIF_FIELDS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 px-1 py-2 text-xs transition-colors hover:bg-surface"
            >
              <dt className="font-medium text-muted">{label}</dt>
              <dd
                className={`max-w-[60%] truncate text-right font-mono font-medium ${exif[key] ? 'text-ink' : 'text-faint'}`}
                title={exif[key] || undefined}
              >
                {exif[key] || EMPTY_VALUE}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="py-6 text-center text-xs text-muted">
          The photographer did not include EXIF data for this photo.
        </p>
      )}

      <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
        Flash removes GPS coordinates from every image and from its technical record to protect the
        photographer&apos;s location.
      </p>
    </section>
  );
}
