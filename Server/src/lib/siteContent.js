/**
 * Website content document — everything guests see that is not inventory:
 * business details, announcement bar, homepage layout, page content, SEO, text overrides.
 * Rates, availability and reservations stay in the PMS.
 */

const HOME_SECTIONS = ['intro', 'properties', 'brands', 'featured', 'trust', 'partners', 'partnerCta'];
const SEO_PAGES = ['home', 'search', 'compounds', 'about', 'faq', 'contact', 'owners', 'careers', 'terms', 'privacy', 'refund'];
const LEGAL_PAGES = ['terms', 'privacy', 'refund'];
const LOCALES = ['en', 'ar'];
const TONES = ['night', 'gold', 'sand'];
const SECTIONS = ['business', 'announcement', 'home', 'pages', 'copy', 'seo', 'tracking'];

const MAX_COPY_KEYS = 3000;

function str(value, max = 500) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function text(value, max = 30000) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);
}

/** Internal path, http(s) URL, or empty — blocks javascript:/data: links */
function link(value) {
  const v = str(value, 1000);
  if (!v) return '';
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

function date(value) {
  const v = str(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

function localized(value, max) {
  const src = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(LOCALES.map((l) => [l, str(src[l], max)]));
}

function defaultSite() {
  return {
    business: {
      name: '',
      tagline: '',
      email: '',
      phone: '',
      phoneDisplay: '',
      whatsapp: '',
      address: '',
      instagram: '',
      facebook: '',
      tiktok: '',
      linkedin: '',
    },
    announcement: {
      enabled: false,
      text: { en: '', ar: '' },
      linkLabel: { en: '', ar: '' },
      href: '',
      startsAt: '',
      endsAt: '',
      tone: 'night',
    },
    home: { sections: HOME_SECTIONS.map((id) => ({ id, enabled: true })) },
    pages: {
      about: { heroImage: '', wideImage: '', portraitImage: '' },
      careers: {
        heroImage: '',
        roles: [
          { title: 'Guest Experience Associate', location: 'New Cairo', type: 'Full-time' },
          { title: 'Property Operations Lead', location: 'North Coast (seasonal)', type: 'Full-time' },
          { title: 'Interior Stylist (Freelance)', location: 'Remote / Cairo', type: 'Contract' },
        ],
      },
      owners: { heroImage: '', sideImage: '' },
      legal: Object.fromEntries(LEGAL_PAGES.map((k) => [k, { en: '', ar: '', updatedAt: '' }])),
    },
    copy: { en: {}, ar: {} },
    seo: {
      titleSuffix: '',
      defaultDescription: '',
      ogImage: '',
      pages: Object.fromEntries(SEO_PAGES.map((k) => [k, { title: '', description: '' }])),
    },
    tracking: { ga4Id: '' },
    updatedAt: '',
  };
}

const sanitizers = {
  business(v = {}) {
    return {
      name: str(v.name, 80),
      tagline: str(v.tagline, 160),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(v.email, 120)) ? str(v.email, 120) : '',
      phone: str(v.phone, 30).replace(/[^\d+]/g, ''),
      phoneDisplay: str(v.phoneDisplay, 40),
      whatsapp: str(v.whatsapp, 30).replace(/[^\d+]/g, ''),
      address: str(v.address, 240),
      instagram: link(v.instagram),
      facebook: link(v.facebook),
      tiktok: link(v.tiktok),
      linkedin: link(v.linkedin),
    };
  },

  announcement(v = {}) {
    return {
      enabled: Boolean(v.enabled),
      text: localized(v.text, 200),
      linkLabel: localized(v.linkLabel, 40),
      href: link(v.href),
      startsAt: date(v.startsAt),
      endsAt: date(v.endsAt),
      tone: TONES.includes(v.tone) ? v.tone : 'night',
    };
  },

  home(v = {}) {
    const seen = new Set();
    const sections = [];
    for (const s of Array.isArray(v.sections) ? v.sections : []) {
      const id = String(s?.id || '');
      if (!HOME_SECTIONS.includes(id) || seen.has(id)) continue;
      seen.add(id);
      sections.push({ id, enabled: s.enabled !== false });
    }
    for (const id of HOME_SECTIONS) if (!seen.has(id)) sections.push({ id, enabled: true });
    return { sections };
  },

  pages(v = {}) {
    const base = defaultSite().pages;
    const about = v.about || {};
    const careers = v.careers || base.careers;
    const owners = v.owners || {};
    const legal = v.legal || {};
    return {
      about: {
        heroImage: link(about.heroImage),
        wideImage: link(about.wideImage),
        portraitImage: link(about.portraitImage),
      },
      careers: {
        heroImage: link(careers.heroImage),
        roles: (Array.isArray(careers.roles) ? careers.roles : [])
          .map((r) => ({ title: str(r?.title, 120), location: str(r?.location, 80), type: str(r?.type, 40) }))
          .filter((r) => r.title)
          .slice(0, 30),
      },
      owners: { heroImage: link(owners.heroImage), sideImage: link(owners.sideImage) },
      legal: Object.fromEntries(
        LEGAL_PAGES.map((k) => {
          const page = legal[k] || {};
          return [k, { en: text(page.en), ar: text(page.ar), updatedAt: date(page.updatedAt) }];
        })
      ),
    };
  },

  copy(v = {}) {
    const out = {};
    for (const locale of LOCALES) {
      const src = v[locale] && typeof v[locale] === 'object' ? v[locale] : {};
      const entries = Object.entries(src)
        .filter(([key, val]) => /^[a-zA-Z][\w.-]{0,80}$/.test(key) && typeof val === 'string' && val.trim())
        .slice(0, MAX_COPY_KEYS)
        .map(([key, val]) => [key, text(val, 2000)]);
      out[locale] = Object.fromEntries(entries);
    }
    return out;
  },

  seo(v = {}) {
    const pages = v.pages || {};
    return {
      titleSuffix: str(v.titleSuffix, 80),
      defaultDescription: str(v.defaultDescription, 300),
      ogImage: link(v.ogImage),
      pages: Object.fromEntries(
        SEO_PAGES.map((k) => [k, { title: str(pages[k]?.title, 120), description: str(pages[k]?.description, 300) }])
      ),
    };
  },

  tracking(v = {}) {
    const ga4Id = str(v.ga4Id, 30).toUpperCase();
    return { ga4Id: /^G-[A-Z0-9]{4,20}$/.test(ga4Id) ? ga4Id : '' };
  },
};

/** Fill any missing section/field from the defaults (stored docs may predate a field). */
function normalizeSite(stored) {
  const base = defaultSite();
  const src = stored && typeof stored === 'object' ? stored : {};
  const out = {};
  for (const key of SECTIONS) out[key] = sanitizers[key]({ ...base[key], ...(src[key] || {}) });
  out.updatedAt = str(src.updatedAt, 40);
  return out;
}

/** Replace only the sections present in the patch; each section is validated as a whole. */
function mergeSite(current, patch = {}) {
  const next = normalizeSite(current);
  for (const key of SECTIONS) {
    if (patch[key] !== undefined) next[key] = sanitizers[key](patch[key]);
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

/* ——— Editable lists shown on guest pages (FAQs, trust points, partners) ——— */

function sanitizeContentLists(body = {}, current = {}) {
  const next = { ...current };
  if (Array.isArray(body.faqs)) {
    next.faqs = body.faqs
      .map((f) => ({ q: str(f?.q, 300), a: text(f?.a, 3000), qAr: str(f?.qAr, 300), aAr: text(f?.aAr, 3000) }))
      .filter((f) => f.q && f.a)
      .slice(0, 100);
  }
  if (Array.isArray(body.trustPoints)) {
    next.trustPoints = body.trustPoints
      .map((p) => ({ title: str(p?.title, 120), body: text(p?.body, 600), titleAr: str(p?.titleAr, 120), bodyAr: text(p?.bodyAr, 600) }))
      .filter((p) => p.title)
      .slice(0, 12);
  }
  if (Array.isArray(body.partners)) {
    next.partners = body.partners
      .map((p, i) => ({ id: str(p?.id, 60) || `partner-${i + 1}`, name: str(p?.name, 80), logo: link(p?.logo) }))
      .filter((p) => p.name)
      .slice(0, 40);
  }
  return next;
}

module.exports = {
  HOME_SECTIONS,
  SEO_PAGES,
  LEGAL_PAGES,
  SECTIONS,
  defaultSite,
  normalizeSite,
  mergeSite,
  sanitizeContentLists,
};
