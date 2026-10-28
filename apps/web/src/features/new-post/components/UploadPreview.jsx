import { LoaderCircle, X } from 'lucide-react';
import { formatBytes } from '../../../lib/format/bytes.js';

const PHASE_LABELS = {
  uploading: 'Uploading',
  analyzing: 'Checking file and reading EXIF',
};

/** Local preview of the selected photo with upload progress. */
export function UploadPreview({ previewUrl, file, phase, progress, onRemove }) {
  const busy = phase === 'uploading' || phase === 'analyzing';
  const percent = Math.round(progress * 100);

  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface">
      <img
        src={previewUrl}
        alt="Preview of the selected photo"
        className="mx-auto max-h-96 w-full object-contain"
      />

      <button
        type="button"
        onClick={onRemove}
        title="Remove photo"
        className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
      >
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Remove photo</span>
      </button>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas px-4 py-2.5 text-[11px] text-muted">
        <span className="truncate font-mono">
          {file?.name} · {formatBytes(file?.size)}
        </span>
        {busy && (
          <span role="status" className="flex shrink-0 items-center gap-1.5 text-primary">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {PHASE_LABELS[phase]}
            {phase === 'uploading' && ` ${percent}%`}
          </span>
        )}
      </div>

      {phase === 'uploading' && (
        <div
          className="h-1 bg-line"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
