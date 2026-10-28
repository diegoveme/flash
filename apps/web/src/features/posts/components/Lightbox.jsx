import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../../hooks/useEscapeKey.js';
import { ExifBadges } from './ExifBadges.jsx';

/** Full-size view of a photo over a dark scrim. Escape or the backdrop closes it. */
export function Lightbox({ post, onClose }) {
  const closeRef = useRef(null);
  useEscapeKey(onClose);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo by @${post.author.username}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/85 p-4 backdrop-blur-md sm:p-6"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        title="Close (Esc)"
        className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2.5 text-white transition-colors hover:bg-black/80"
      >
        <X className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Close</span>
      </button>

      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col items-center">
        <img
          src={post.imageUrl}
          alt={post.description || `Photograph by @${post.author.username}`}
          className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
        />
        <div className="mt-3 flex w-full flex-col items-center justify-between gap-3 rounded-lg border border-line bg-canvas/90 px-4 py-2 text-xs text-ink backdrop-blur-md sm:flex-row">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-semibold">@{post.author.username}</span>
            {post.description && (
              <>
                <span className="text-faint" aria-hidden="true">
                  ·
                </span>
                <span className="max-w-md truncate text-subtle">{post.description}</span>
              </>
            )}
          </div>
          <ExifBadges exif={post.exif} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
