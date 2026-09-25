import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Globe, Heart, Menu, Moon, Sun, User, X } from 'lucide-react';
import { brand } from '../../theme/brand';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

const NAV = [
  { labelKey: 'nav.stays', to: '/search' },
  { labelKey: 'nav.compounds', to: '/compounds' },
  { labelKey: 'nav.about', to: '/about' },
  { labelKey: 'nav.faq', to: '/faq' },
  { labelKey: 'nav.becomePartner', to: '/owners' },
];

function ThemeToggle({ onDark }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      data-on={isDark ? 'true' : 'false'}
      className={cn(
        'prime-theme-toggle',
        onDark
          ? 'border-white/35 bg-white/15 data-[on=true]:border-prime-gold/60 data-[on=true]:bg-prime-night/80'
          : 'border-prime-line bg-prime-mist data-[on=true]:border-prime-gold data-[on=true]:bg-prime-night'
      )}
    >
      <span className="prime-theme-toggle__thumb">
        {isDark ? <Moon size={12} strokeWidth={2.25} /> : <Sun size={12} strokeWidth={2.25} />}
      </span>
    </button>
  );
}

export default function Header({ overHero = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const { t, locale, toggleLocale } = useLocale();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!overHero) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /** Light bar + dark chrome (search etc.) vs transparent hero + white chrome */
  const solid = !overHero || scrolled;
  const onDark = !solid;

  return (
    <>
      <header
        className={cn(
          'prime-header-shell',
          overHero ? 'fixed' : 'sticky',
          'inset-x-0 top-0 z-50 transition-all duration-500',
          solid
            ? 'border-b border-prime-line/80 bg-prime-sand/95 shadow-[0_1px_0_rgba(34,31,32,0.06)] backdrop-blur-md'
            : 'bg-transparent'
        )}
      >
        <div className="relative mx-auto flex h-16 max-w-prime items-center justify-between gap-2 px-4 sm:h-[80px] sm:gap-4 sm:px-6 md:h-[88px] md:px-8">
          <Link to="/" className="relative z-10 flex min-w-0 shrink-0 items-center">
            <img
              src={brand.logo}
              alt={brand.name}
              className={cn(
                'h-9 w-auto max-w-[140px] object-contain transition sm:h-12 sm:max-w-none md:h-14',
                solid && 'brightness-0'
              )}
            />
          </Link>

          <nav className="pointer-events-none absolute inset-x-0 hidden items-center justify-center gap-0.5 xl:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'pointer-events-auto relative px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition 2xl:px-3',
                    solid
                      ? isActive
                        ? 'text-prime-ink'
                        : 'text-prime-ink/65 hover:text-prime-ink'
                      : isActive
                        ? 'text-white'
                        : 'text-white/75 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {t(item.labelKey)}
                    <span
                      className={cn(
                        'absolute inset-x-2.5 -bottom-0.5 h-px origin-center scale-x-0 bg-prime-gold transition duration-300',
                        isActive && 'scale-x-100'
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="relative z-10 flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              className={cn(
                'hidden items-center gap-1.5 px-2 py-1.5 text-sm font-bold transition sm:inline-flex',
                solid
                  ? 'text-prime-ink/70 hover:text-prime-ink'
                  : 'text-white/80 hover:text-white'
              )}
              aria-label="Toggle language"
            >
              <Globe size={15} strokeWidth={2} />
              {locale === 'en' ? 'عربي' : 'EN'}
            </button>

            <ThemeToggle onDark={onDark} />

            <button
              type="button"
              onClick={() => navigate('/wishlist')}
              className={cn(
                'hidden p-2 transition sm:inline-flex',
                solid
                  ? 'text-prime-ink hover:text-prime-gold-deep'
                  : 'text-white hover:text-prime-gold'
              )}
              aria-label={t('nav.wishlist')}
            >
              <Heart size={17} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={() => navigate(user ? '/account' : '/sign-in')}
              className={cn(
                'hidden items-center gap-2 border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition md:inline-flex',
                solid
                  ? 'border-prime-ink/25 text-prime-ink hover:border-prime-gold hover:text-prime-gold-deep'
                  : 'border-white/30 text-white hover:border-prime-gold hover:text-prime-gold'
              )}
            >
              <User size={14} strokeWidth={2} />
              <span className="hidden lg:inline">{user ? t('nav.account') : t('nav.signIn')}</span>
            </button>

            <button
              type="button"
              className={cn(
                'inline-flex p-2 xl:hidden',
                solid ? 'text-prime-ink' : 'text-white'
              )}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="prime-header-shell fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-prime-sand pt-16 sm:pt-[80px] xl:hidden">
          <nav className="flex flex-col gap-1 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] py-6">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="border-b border-prime-line/60 py-4 font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink"
                onClick={() => setMobileOpen(false)}
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
            <Link
              to="/contact"
              className="border-b border-prime-line/60 py-4 font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink"
              onClick={() => setMobileOpen(false)}
            >
              {t('nav.contact')}
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={toggleLocale}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-prime-ink/70 sm:hidden"
              >
                <Globe size={15} />
                {locale === 'en' ? 'عربي' : 'EN'}
              </button>
              <Link
                to="/wishlist"
                className="text-sm font-bold text-prime-ink/70 sm:hidden"
                onClick={() => setMobileOpen(false)}
              >
                {t('nav.wishlist')}
              </Link>
              <Link
                to={user ? '/account' : '/sign-in'}
                className="text-sm font-bold text-prime-ink md:hidden"
                onClick={() => setMobileOpen(false)}
              >
                {user ? t('nav.account') : t('nav.signIn')}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
