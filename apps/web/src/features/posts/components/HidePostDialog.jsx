import { ConfirmDialog } from '../../../components/ConfirmDialog.jsx';

export function HidePostDialog({ open, busy, error, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      open={open}
      title="Hide this work?"
      confirmLabel="Hide work"
      busy={busy}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      The photo will stop appearing in the feed and in your profile, and its page will no longer be
      available. Links that were already shared may keep working for a while because of caching.
    </ConfirmDialog>
  );
}
