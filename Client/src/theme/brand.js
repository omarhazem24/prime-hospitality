export const brand = {
  id: 'prime',
  name: 'Prime Hospitality',
  shortName: 'Prime',
  tagline: 'Prime stays for Prime customers.',  logo: '/brand/logo-transparent.png',
  /** White letters + gold key — for dark / photo backgrounds */
  logoLight: '/brand/logo-light.png',
  /** Charcoal letters + gold key — for light backgrounds */
  logoDark: '/brand/logo-dark.png',
  logoMark: '/brand/logo-prime-mark.png',
  logoFull: '/brand/Hospitality.png',
  domain: import.meta.env.VITE_SITE_URL || 'https://primehospitality.com',
  colors: {
    white: '#FFFFFF',
    ink: '#221F20',
    charcoal: '#2E2A2B',
    gold: '#AC946B',
    muted: '#6E6764',
  },
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER || '+201000000000',
  phoneDisplay: import.meta.env.VITE_PHONE_DISPLAY || '0100 000 0000',
  email: import.meta.env.VITE_CONTACT_EMAIL || 'hello@primehospitality.com',
  address: 'New Cairo, Egypt',
  social: {
    instagram: '#',
    facebook: '#',
  },
  copyright: '© 2026 Prime Hospitality. All rights reserved.',
};

export function whatsappHref(text) {
  const n = brand.whatsapp.replace(/\D/g, '');
  const base = `https://wa.me/${n}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function listingWhatsAppMessage(pathnameOrUrl) {
  const raw = String(pathnameOrUrl || '').trim();
  if (!raw) return 'Hi Prime — I have a question about a stay.';

  let listingUrl = raw;
  if (raw.startsWith('/')) {
    const base = String(brand.domain || '').replace(/\/$/, '');
    listingUrl = `${base}${raw}`;
  }

  return `Hi Prime — I'd like to inquire about this stay:\n${listingUrl}`;
}

export function formatMoney(amount, currency = 'EGP') {
  const n = Number(amount) || 0;
  return `${n.toLocaleString('en-EG')} ${currency}`;
}
