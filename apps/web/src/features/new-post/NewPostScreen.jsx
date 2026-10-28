import { DESCRIPTION_MAX_LENGTH, countCharacters, normalizeTags } from '@flash/shared';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert } from '../../components/Alert.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { createPost } from '../../lib/api/posts.js';
import { toExifFormValues, toExifPayload } from '../../lib/format/exif.js';
import { paths } from '../../lib/routing.js';
import { ExifForm } from './components/ExifForm.jsx';
import { GpsNotice } from './components/GpsNotice.jsx';
import { PostDetailsFields } from './components/PostDetailsFields.jsx';
import { UploadDropzone } from './components/UploadDropzone.jsx';
import { UploadPreview } from './components/UploadPreview.jsx';
import { useImageUpload } from './hooks/useImageUpload.js';

/** Screen 3: upload a photo, review its EXIF and publish. Only the image is required. */
export function NewPostScreen() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [exifValues, setExifValues] = useState(() => toExifFormValues());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useDocumentTitle('New post');

  const handleAnalyzed = useCallback((exif) => setExifValues(toExifFormValues(exif)), []);
  const upload = useImageUpload({ onAnalyzed: handleAnalyzed });

  const { tags, invalid: invalidTags } = normalizeTags(tagsInput);
  const descriptionTooLong = countCharacters(description) > DESCRIPTION_MAX_LENGTH;
  const canSubmit =
    upload.phase === 'ready' && !submitting && !descriptionTooLong && invalidTags.length === 0;

  const handleRemovePhoto = () => {
    upload.reset();
    setExifValues(toExifFormValues());
    setSubmitError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { post } = await createPost({
        uploadId: upload.uploadId,
        description: description.trim() || undefined,
        tags,
        exif: toExifPayload(exifValues),
      });
      navigate(paths.post(post.id), { replace: true });
    } catch (err) {
      setSubmitError(err);
      setSubmitting(false);
    }
  };

  const fieldErrors = submitError?.fields ?? {};
  // The API reports EXIF problems per field, as "exif.<key>".
  const exifFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith('exif.'))
      .map(([key, message]) => [key.slice('exif.'.length), message]),
  );
  const uploadErrorMessage = upload.error?.message;

  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-line pb-6">
        <Link
          to={paths.feed()}
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Cancel and return</span>
        </Link>
        <h1 className="font-headline text-2xl font-bold text-ink sm:text-3xl">New post</h1>
        <p className="mt-1 text-xs text-subtle">
          Share a photograph with the community. Location data is always removed before publishing.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        <section
          className="rounded-lg border border-line bg-canvas p-6"
          aria-labelledby="photo-title"
        >
          <h2
            id="photo-title"
            className="mb-3 block text-xs font-semibold tracking-wider text-ink uppercase"
          >
            Photo (JPEG or PNG, max 10 MB) <span className="text-danger">*</span>
          </h2>

          {upload.previewUrl ? (
            <UploadPreview
              previewUrl={upload.previewUrl}
              file={upload.file}
              phase={upload.phase}
              progress={upload.progress}
              onRemove={handleRemovePhoto}
            />
          ) : (
            <UploadDropzone onFile={upload.selectFile} describedBy="photo-error" />
          )}

          <div id="photo-error">
            {uploadErrorMessage && (
              <Alert variant="error" className="mt-4">
                <span>{uploadErrorMessage}</span>
                {upload.phase === 'error' && (
                  <button
                    type="button"
                    onClick={upload.retry}
                    className="ml-2 font-semibold underline underline-offset-2"
                  >
                    Try again
                  </button>
                )}
              </Alert>
            )}
            {fieldErrors.uploadId && (
              <Alert variant="error" className="mt-4">
                {fieldErrors.uploadId}
              </Alert>
            )}
          </div>

          {upload.phase === 'ready' && <GpsNotice gpsRemoved={upload.gpsRemoved} />}
        </section>

        <PostDetailsFields
          description={description}
          onDescriptionChange={setDescription}
          tagsInput={tagsInput}
          onTagsChange={setTagsInput}
          errors={fieldErrors}
        />

        <ExifForm
          values={exifValues}
          onChange={(key, value) => setExifValues((current) => ({ ...current, [key]: value }))}
          disabled={upload.phase !== 'ready'}
          error={fieldErrors.exif}
          fieldErrors={exifFieldErrors}
        />

        {submitError && <Alert variant="error">{submitError.message}</Alert>}

        <div className="flex items-center justify-end gap-4 border-t border-line pt-4">
          <Link
            to={paths.feed()}
            className="rounded border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-raised"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded bg-primary px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  );
}
