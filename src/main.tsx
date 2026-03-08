import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'sonner';
import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/auth/register', method: 'POST' },
    { path: '/api/estimate', method: 'POST' },
  ],
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster richColors position="top-right" />
  </StrictMode>,
);
