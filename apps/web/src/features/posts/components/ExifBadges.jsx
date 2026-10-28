import { exifBadges } from '../../../lib/format/exif.js';

/** Compact pills with aperture, shutter speed, focal length and ISO. */
export function ExifBadges({ exif, className = '' }) {
  const items = exifBadges(exif);
  if (items.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Camera settings">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex items-center rounded-[2px] border border-line/80 bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wider text-body uppercase shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
