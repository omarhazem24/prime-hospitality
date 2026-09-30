import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { brand } from '../theme/brand';

/** Route → SEO page key edited in Admin › Marketing › SEO */
export const SEO_ROUTES = {
  '/': 'home',
  '/search': 'search',
  '/compounds': 'compounds',
  '/about': 'about',
  '/faq': 'faq',
  '/contact': 'contact',
  '/owners': 'owners',
  '/careers': 'careers',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/refund-policy': 'refund',
};

export const SEO_DEFAULT_TITLES = {
  home: 'Prime stays for Prime customers',
  search: 'Find a stay',
  compounds: 'Properties',
  about: 'About Prime',
  faq: 'FAQ',
  contact: 'Contact',
  owners: 'List your property',
  careers: 'Careers',
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  refund: 'Refund Policy',
};

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) return;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applySeo({ title, description, image }, seo = {}) {
  const suffix = seo.titleSuffix || brand.name;
  const fullTitle = title ? `${title} · ${suffix}` : suffix;
  document.title = fullTitle;
  const desc = description || seo.defaultDescription;
  setMeta('name', 'description', desc);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:image', image || seo.ogImage);
}

/** Title / description / share image for the static routes; unit pages set their own. */
export default function SeoManager() {
  const { pathname } = useLocation();
  const { site } = useSite();

  useEffect(() => {
    const key = SEO_ROUTES[pathname];
    if (!key) return;
    const page = site.seo?.pages?.[key] || {};
    applySeo({ title: page.title || SEO_DEFAULT_TITLES[key], description: page.description }, site.seo);
  }, [pathname, site.seo]);

  return null;
}
