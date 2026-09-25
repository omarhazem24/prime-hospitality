import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/client';

function injectScript(id, html) {
  if (document.getElementById(id)) return;
  const el = document.createElement('div');
  el.id = id;
  el.innerHTML = html;
  const scripts = el.querySelectorAll('script');
  scripts.forEach((old) => {
    const s = document.createElement('script');
    Array.from(old.attributes).forEach((attr) => s.setAttribute(attr.name, attr.value));
    s.text = old.textContent || '';
    document.head.appendChild(s);
  });
  const noscripts = el.querySelectorAll('noscript');
  noscripts.forEach((n) => document.body.appendChild(n.cloneNode(true)));
}

/**
 * Loads public pixel / tag IDs from CMS and injects Meta + optional GTM.
 */
export default function MarketingPixels() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/admin')) return undefined;
    let cancelled = false;
    api
      .getPixels()
      .then((pixels) => {
        if (cancelled) return;
        const metaId = String(pixels.metaPixelId || pixels.facebookPixelId || '').trim();
        const gtmId = String(pixels.gtmId || '').trim();

        if (metaId && /^\d+$/.test(metaId)) {
          injectScript(
            'prime-meta-pixel',
            `
            <script>
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaId}');
              fbq('track', 'PageView');
            </script>
            <noscript><img height="1" width="1" style="display:none"
              src="https://www.facebook.com/tr?id=${metaId}&ev=PageView&noscript=1"/></noscript>
            `
          );
        }

        if (gtmId && /^GTM-[A-Z0-9]+$/i.test(gtmId)) {
          injectScript(
            'prime-gtm',
            `
            <script>
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            </script>
            `
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
