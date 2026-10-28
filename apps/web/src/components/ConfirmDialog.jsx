import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks/useEscapeKey.js';
import { Alert } from './Alert.jsx';

const CONFIRM_TONES = {
  danger: 'bg-danger hover:bg-danger-hover',
  primary: 'bg-primary hover:bg-primary-hover',
};

/**
 * Modal confirmation (level 3 elevation: white card over an obsidian scrim).
 * Escape or Cancel closes it unless an action is in progress.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const cancelRef = useRef(null);

  const handleCancel = useCallback(() => {
    if (!busy) onCancel();
  }, [busy, onCancel]);

  useEscapeKey(handleCancel, open);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-line bg-canvas p-6 shadow-modal"
      >
        <h3 id={titleId} className="mb-2 font-headline text-lg font-semibold text-ink">
          {title}
        </h3>
        <div className="mb-6 text-xs leading-relaxed text-subtle">{children}</div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="rounded border border-line bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-raised disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${CONFIRM_TONES[tone]}`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
