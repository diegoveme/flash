import { useEffect } from 'react';

const APP_NAME = 'Flash';

/** Sets the browser tab title as "<title> | Flash". */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [title]);
}
