import { useEffect } from 'react';
import { StoreSettings } from '../types';

// Google Analytics 4 + Meta Pixel. No hacen nada hasta que el admin cargue
// los IDs en Envíos y Comercio > Medición.
export function Analytics({ settings }: { settings?: StoreSettings }) {
  const gaId = (settings?.gaId || '').trim();
  const pixelId = (settings?.metaPixelId || '').trim();

  useEffect(() => {
    if (!gaId || typeof document === 'undefined') return;
    if (document.querySelector(`script[data-ga="${gaId}"]`)) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    s.setAttribute('data-ga', gaId);
    document.head.appendChild(s);
    const inline = document.createElement('script');
    inline.setAttribute('data-ga-inline', gaId);
    inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
    document.head.appendChild(inline);
  }, [gaId]);

  useEffect(() => {
    if (!pixelId || typeof document === 'undefined' || typeof window === 'undefined') return;
    const w = window as any;
    if (w.fbq && w.fbq.callMethod) return;
    // Snippet oficial de Meta Pixel (init + PageView)
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any) {
      let n: any, t: any, s: any;
      if (f.fbq) return;
      n = f.fbq = function (...args: any[]) {
        n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(w, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    try {
      w.fbq('init', pixelId);
      w.fbq('track', 'PageView');
    } catch { /* el SDK lo procesa al cargar */ }
  }, [pixelId]);

  return null;
}
