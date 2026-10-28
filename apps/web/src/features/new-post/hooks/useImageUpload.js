import { useCallback, useEffect, useRef, useState } from 'react';
import { createUpload, getUploadExif, uploadToStorage } from '../../../lib/api/uploads.js';
import { validateImageFile } from '../imageFile.js';

const IDLE = {
  phase: 'idle', // idle | uploading | analyzing | ready | error
  file: null,
  previewUrl: null,
  progress: 0,
  uploadId: null,
  gpsRemoved: null,
  error: null,
};

/**
 * Upload flow for a new post:
 * 1. POST /uploads for a presigned POST,
 * 2. send the file straight to storage,
 * 3. GET /uploads/{id}/exif to validate it and read its EXIF (without GPS).
 * Starting over (or removing the photo) cancels any step still running.
 *
 * @param {{ onAnalyzed?: (exif: Record<string, string>) => void }} [options]
 */
export function useImageUpload({ onAnalyzed } = {}) {
  const [state, setState] = useState(IDLE);
  const attemptRef = useRef(0);

  useEffect(() => {
    const url = state.previewUrl;
    if (!url) return undefined;
    return () => URL.revokeObjectURL(url);
  }, [state.previewUrl]);

  const start = useCallback(
    async (file, previewUrl) => {
      const attempt = ++attemptRef.current;
      const isCurrent = () => attempt === attemptRef.current;
      setState({ ...IDLE, phase: 'uploading', file, previewUrl });

      try {
        const upload = await createUpload({ contentType: file.type, size: file.size });
        if (!isCurrent()) return;

        await uploadToStorage({
          url: upload.url,
          fields: upload.fields,
          file,
          onProgress: (ratio) => {
            if (isCurrent()) setState((current) => ({ ...current, progress: ratio }));
          },
        });
        if (!isCurrent()) return;
        setState((current) => ({ ...current, phase: 'analyzing', progress: 1 }));

        const analysis = await getUploadExif(upload.uploadId);
        if (!isCurrent()) return;
        setState((current) => ({
          ...current,
          phase: 'ready',
          uploadId: upload.uploadId,
          gpsRemoved: Boolean(analysis.gpsRemoved),
        }));
        onAnalyzed?.(analysis.exif ?? {});
      } catch (error) {
        if (isCurrent()) setState((current) => ({ ...current, phase: 'error', error }));
      }
    },
    [onAnalyzed],
  );

  const selectFile = useCallback(
    (file) => {
      const problem = validateImageFile(file);
      if (problem) {
        attemptRef.current += 1;
        setState({ ...IDLE, error: { message: problem } });
        return;
      }
      start(file, URL.createObjectURL(file));
    },
    [start],
  );

  const retry = useCallback(() => {
    if (state.file) start(state.file, state.previewUrl);
  }, [start, state.file, state.previewUrl]);

  const reset = useCallback(() => {
    attemptRef.current += 1;
    setState(IDLE);
  }, []);

  return { ...state, selectFile, retry, reset };
}
