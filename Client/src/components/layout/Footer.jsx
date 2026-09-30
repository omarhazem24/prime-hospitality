import { Link } from 'react-router-dom';
import { ArrowUp, Facebook, Instagram, Linkedin, Music2 } from 'lucide-react';
import { brand, whatsappHref } from '../../theme/brand';
import { useLocale } from '../../context/LocaleContext';
import { useSite } from '../../context/SiteContext';

const COLS = [
  {
    titleKey: 'footer.explore',
    links: [
      { key: 'footer.stays', to: '/search' },
      { key: 'footer.properties', to: '/compounds' },
      { key: 'footer.about', to: '/about' },
      { key: 'footer.careers', to: '/careers' },
    ],
  },
  {
    titleKey: 'footer.guests',
    links: [
      { key: 'footer.faq', to: '/faq' },
      { key: 'footer.contact', to: '/contact' },
      { key: 'footer.wishlist', to: '/wishlist' },
      { key: 'footer.refund', to: '/refund-policy' },
    ],
  },
  {
    titleKey: 'footer.partners',
    links: [
      { key: 'footer.listProperty', to: '/owners' },
      { key: 'footer.terms', to: '/terms' },
      { key: 'footer.privacy', to: '/privacy' },
    ],
  },
];

const SOCIAL = [
  ['instagram', 'Instagram', Instagram],
  ['facebook', 'Facebook', Facebook],
  ['tiktok', 'TikTok', Music2],
  ['linkedin', 'LinkedIn', Linkedin],
];

export default function Footer() {
  const { t } = useLocale();
  useSite();
  const social = SOCIAL.filter(([key]) => brand.social[key] && brand.social[key] !== '#');

  return (
    <footer className="relative overflow-hidden bg-[#221f20] text-white">
      <div className="prime-container pt-20 md:pt-28">
        <div className="grid gap-10 border-b border-white/10 pb-16 md:pb-20 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <h2 className="max-w-3xl font-display text-display-lg font-medium text-balance">
            {t('footer.headline')} <em className="text-prime-gold-soft">{t('footer.headlineEm')}</em> {t('footer.headlineEnd')}
          </h2>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link to="/search" className="prime-btn-gold">
              {t('footer.book')}
            </Link>
            <a href={whatsappHref()} target="_blank" rel="noreferrer" className="prime-btn-ghost">
              {t('footer.whatsapp')}
            </a>
          </div>
        </div>

        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <img src={brand.logoLight} alt={brand.name} width="640" height="228" loading="lazy" className="h-12 w-auto" />
            <address className="mt-8 space-y-2 text-[15px] font-light not-italic leading-relaxed text-white/60">
              <a href={`mailto:${brand.email}`} className="block transition hover:text-white">
                {brand.email}
              </a>
              <a href={`tel:${brand.phone || brand.whatsapp}`} className="block transition hover:text-white">
                {brand.phoneDisplay}
              </a>
              <p>{brand.address}</p>
            </address>
          </div>

          {COLS.map((col) => (
            <nav key={col.titleKey} aria-label={t(col.titleKey)}>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-prime-gold">{t(col.titleKey)}</p>
              <ul className="mt-6 space-y-3.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[15px] font-light text-white/65 transition hover:text-white">
                      {t(l.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-6 border-t border-white/10 py-7 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {brand.name}. {t('footer.rights')}
          </span>
          <div className="flex items-center gap-2">
            {social.map(([key, label, Icon]) => (
              <a
                key={key}
                href={brand.social[key]}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="grid h-10 w-10 place-items-center border border-white/15 text-white/70 transition hover:border-prime-gold hover:text-prime-gold"
              >
                <Icon size={16} strokeWidth={1.5} />
              </a>
            ))}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Back to top"
              className="ms-3 grid h-10 w-10 place-items-center bg-white/5 text-white/70 transition hover:bg-prime-gold hover:text-[#221f20]"
            >
              <ArrowUp size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <p
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap text-center font-sans text-[22vw] font-light leading-[0.75] tracking-[0.18em] text-white/[0.035]"
      >
        PRIME
      </p>
    </footer>
  );
}
