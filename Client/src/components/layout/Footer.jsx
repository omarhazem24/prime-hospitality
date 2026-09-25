import { Link } from 'react-router-dom';
import { brand } from '../../theme/brand';
import KeyLine from '../ui/KeyLine';

const COLS = [
  {
    title: 'Explore',
    links: [
      { label: 'Stays', to: '/search' },
      { label: 'Compounds', to: '/compounds' },
      { label: 'About', to: '/about' },
      { label: 'Careers', to: '/careers' },
    ],
  },
  {
    title: 'Guests',
    links: [
      { label: 'FAQ', to: '/faq' },
      { label: 'Contact', to: '/contact' },
      { label: 'Wishlist', to: '/wishlist' },
      { label: 'Account', to: '/account' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { label: 'Become a Partner', to: '/owners' },
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Refund Policy', to: '/refund-policy' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-prime-night text-white">
      <div className="mx-auto max-w-prime px-5 pt-16 sm:px-8 md:pt-20">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <img
              src={brand.logo}
              alt={brand.name}
              className="h-14 w-auto object-contain brightness-0 invert"
            />
            <KeyLine tone="light" className="mt-6 max-w-[5rem]" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">{brand.tagline}</p>
          </div>
          <div className="text-sm text-white/45 md:text-end">
            <p>{brand.email}</p>
            <p className="mt-1">{brand.phoneDisplay}</p>
            <p className="mt-1">{brand.address}</p>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-3">
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-prime-gold">
                {col.title}
              </p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-sm text-white/60 transition hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>{brand.copyright}</span>
          <span className="tracking-[0.18em] uppercase">{brand.shortName}</span>
        </div>
      </div>
    </footer>
  );
}
