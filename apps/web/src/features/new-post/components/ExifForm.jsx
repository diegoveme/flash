import { EXIF_FIELDS } from '@flash/shared';
import { SlidersHorizontal } from 'lucide-react';
import { useId } from 'react';

const PLACEHOLDERS = {
  cameraMake: 'e.g. Fujifilm',
  cameraModel: 'e.g. X-T5',
  lens: 'e.g. XF 23mm f/1.4',
  focalLength: 'e.g. 35mm',
  aperture: 'e.g. f/1.8',
  shutterSpeed: 'e.g. 1/250s',
  iso: 'e.g. 400',
  exposureBias: 'e.g. -0.3 EV',
  meteringMode: 'e.g. Spot',
  flash: 'e.g. Did not fire',
  dateTaken: 'e.g. 2026-05-14',
};

/**
 * Editable EXIF fields, prefilled with what the server extracted. Only the
 * shared whitelist is offered, so there is no way to type GPS data here.
 */
export function ExifForm({ values, onChange, disabled = false, error, fieldErrors = {} }) {
  const baseId = useId();

  return (
    <section
      className="rounded-lg border border-line bg-canvas p-6"
      aria-labelledby={`${baseId}-title`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2
            id={`${baseId}-title`}
            className="font-headline text-sm font-semibold tracking-wider text-ink uppercase"
          >
            EXIF data (extracted and editable)
          </h2>
        </div>
        <span className="font-mono text-[11px] text-muted">No GPS stored</span>
      </div>

      <fieldset
        disabled={disabled}
        className="grid grid-cols-1 gap-4 disabled:opacity-60 sm:grid-cols-2 md:grid-cols-3"
      >
        <legend className="sr-only">EXIF fields</legend>
        {EXIF_FIELDS.map(({ key, label, maxLength }) => (
          <div key={key}>
            <label
              htmlFor={`${baseId}-${key}`}
              className="mb-1 block text-[11px] font-medium text-muted"
            >
              {label}
            </label>
            <input
              id={`${baseId}-${key}`}
              type="text"
              value={values[key] ?? ''}
              maxLength={maxLength}
              placeholder={PLACEHOLDERS[key]}
              onChange={(event) => onChange(key, event.target.value)}
              aria-invalid={fieldErrors[key] ? true : undefined}
              aria-describedby={fieldErrors[key] ? `${baseId}-${key}-error` : undefined}
              className="field p-2 font-mono"
            />
            {fieldErrors[key] && (
              <p id={`${baseId}-${key}-error`} className="mt-1 text-[11px] text-danger">
                {fieldErrors[key]}
              </p>
            )}
          </div>
        ))}
      </fieldset>

      {disabled && (
        <p className="mt-3 text-[11px] text-muted">
          Upload a photo to fill these fields automatically.
        </p>
      )}
      {error && <p className="mt-3 text-[11px] text-danger">{error}</p>}
    </section>
  );
}
