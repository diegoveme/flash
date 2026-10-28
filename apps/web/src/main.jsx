import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './app/providers/AuthProvider.jsx';
import { router } from './app/router.jsx';
import { UnreadCountProvider } from './features/notifications/unread/UnreadCountProvider.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <UnreadCountProvider>
        <RouterProvider router={router} />
      </UnreadCountProvider>
    </AuthProvider>
  </StrictMode>,
);
