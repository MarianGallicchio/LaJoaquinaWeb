import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import StoreApp from './StoreApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreApp />
  </StrictMode>,
);

// PWA: service worker solo en producción (no interfiere con el dev)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
