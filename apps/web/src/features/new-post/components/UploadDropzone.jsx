import { Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { ACCEPTED_IMAGE_TYPES } from '../imageFile.js';

/** Click, keyboard or drag-and-drop file picker for one JPEG/PNG photo. */
export function UploadDropzone({ onFile, describedBy }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (fileList) => {
    const file = fileList?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pick(event.dataTransfer.files);
      }}
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
        dragging
          ? 'border-primary bg-surface-raised'
          : 'border-line-strong bg-surface hover:border-primary hover:bg-surface-raised'
      }`}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        aria-describedby={describedBy}
        className="sr-only"
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = '';
        }}
      />
      <Upload className="mx-auto mb-3 h-10 w-10 text-muted" aria-hidden="true" />
      <label htmlFor={inputId} className="cursor-pointer text-sm font-semibold text-ink">
        <span className="text-primary underline-offset-2 hover:underline">Choose a photo</span> or
        drag and drop it here
      </label>
      <p className="mt-1 text-xs text-muted">JPEG or PNG · up to 10 MB</p>
    </div>
  );
}
