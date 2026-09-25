import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import HeroSearch from '../components/home/HeroSearch';
import CompoundGrid from '../components/home/CompoundGrid';
import TrustSection from '../components/home/TrustSection';
import PartnersSection from '../components/home/PartnersSection';
import PartnerCta from '../components/home/PartnerCta';
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard';
import KeyLine from '../components/ui/KeyLine';
import api from '../api/client';
import { brand } from '../theme/brand';
import { useLocale } from '../context/LocaleContext';
import { cn } from '../utils/cn';

const HERO_FALLBACK = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdbc?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2200&q=85',
];

export default function HomePage() {
  const { t } = useLocale();
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroImages, setHeroImages] = useState(HERO_FALLBACK);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getSlideshow()
      .then((res) => {
        if (cancelled) return;
        const urls = (res.items || []).map((s) => s.image).filter(Boolean);
        if (urls.length) setHeroImages(urls);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!heroImages.length) return undefined;
    const id = setInterval(() => setHeroIndex((i) => (i + 1) % heroImages.length), 8000);
    return () => clearInterval(id);
  }, [heroImages]);

  useEffect(() => {
    setHeroIndex(0);
  }, [heroImages]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getFeatured(8)
      .then((res) => {
        if (!cancelled) setFeatured(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setFeatured([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lead = featured[0];
  const rest = featured.slice(1);

  return (
    <div className={entered ? 'prime-fade-in' : 'opacity-0'}>
      <Header overHero />

      <section className="prime-frame relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-prime-night">
        <div className="pointer-events-none absolute inset-0">
          {heroImages.map((src, i) => (
            <div
              key={src}
              className={cn(
                'absolute inset-0 overflow-hidden transition-opacity duration-[2000ms]',
                i === heroIndex ? 'opacity-100' : 'opacity-0'
              )}
            >
              <img
                src={src}
                alt=""
                className={cn(
                  'h-full w-full scale-105 object-cover object-[72%_center] brightness-[0.72] contrast-[1.05]',
                  i === heroIndex && 'prime-kenburns'
                )}
                fetchPriority={i === 0 ? 'high' : 'low'}
              />
            </div>
          ))}
          {/* Text-safe left; photo stays vivid on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-prime-night/90 via-prime-night/48 to-prime-night/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-prime-night/75 via-transparent to-prime-night/30" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-prime flex-1 flex-col px-4 pb-6 pt-24 sm:px-8 sm:pb-10 sm:pt-32 lg:pb-12 lg:pt-36">
          <div className="flex flex-1 flex-col justify-center py-4 sm:py-6 lg:max-w-[56%] lg:py-8">
            <div
              className={cn(entered ? 'prime-fade-up' : 'opacity-0')}
              style={{ animationDelay: '0.1s' }}
            >
              <h1 className="flex max-w-full flex-wrap items-baseline gap-x-[0.35em] gap-y-2 font-display text-[clamp(1.75rem,6vw,4rem)] font-bold leading-[1.12] tracking-[-0.038em] text-white sm:gap-y-3">
                <span className="whitespace-nowrap">{t('home.heroTitleBefore')}</span>
                <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-0">
                  <img
                    src={`${brand.logoMark}?v=2`}
                    alt="Prime"
                    className="relative top-[0.20em] -ms-1 h-[1.15em] w-auto max-w-[min(100%,280px)] shrink-0 object-contain object-center sm:-ms-3 sm:h-[1.22em]"
                  />
                  <span className="ms-1 sm:ms-1.5">{t('home.heroTitleAfter')}</span>
                </span>
              </h1>
              <p className="mt-6 max-w-[28ch] text-sm font-medium leading-relaxed tracking-wide text-white sm:mt-8 sm:text-[15px] md:mt-9 md:text-base">
                {t('home.heroSubtitle')}
              </p>
            </div>
          </div>

          <div
            className={cn('-translate-y-2 w-full sm:-translate-y-4 lg:-translate-y-6', entered ? 'prime-fade-up' : 'opacity-0')}
            style={{ animationDelay: '0.28s' }}
          >
            <HeroSearch />
            <div className="mt-7 flex items-center gap-2.5">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setHeroIndex(i)}
                  className={cn(
                    'h-[2px] transition-all duration-500',
                    i === heroIndex ? 'w-12 bg-prime-gold' : 'w-5 bg-white/30 hover:bg-white/55'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <CompoundGrid limit={8} homeOnly />

      <section className="prime-section bg-white">
        <div className="mx-auto max-w-prime px-5 sm:px-8">
          <div className="mb-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="prime-eyebrow mb-3">{t('home.collection')}</p>
              <h2 className="font-display text-display-lg text-prime-ink">{t('home.featured')}</h2>
              <KeyLine className="mt-6 max-w-[5.5rem]" />
            </div>
            <Link
              to="/search"
              className="group inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-prime-ink transition hover:text-prime-gold-deep"
            >
              {t('home.viewAll')}
              <span className="inline-block h-px w-8 bg-prime-gold transition-all group-hover:w-12" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : !featured.length ? (
            <p className="text-prime-muted">No featured stays yet.</p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
              {lead ? (
                <div className="lg:col-span-7">
                  <ListingCard listing={lead} priority featured />
                </div>
              ) : null}
              <div className="grid gap-8 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 xl:grid-cols-2">
                {rest.slice(0, 4).map((u, i) => (
                  <ListingCard key={u.id} listing={u} priority={i < 2} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <TrustSection />
      <PartnersSection />
      <PartnerCta />
      <Footer />
    </div>
  );
}
