import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLocale } from '../../context/LocaleContext';
import KeyLine from '../ui/KeyLine';
import { cn } from '../../utils/cn';

export default function CompoundGrid({ limit, hideIntro = false, homeOnly = false }) {
  const { t } = useLocale();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.getCompounds(homeOnly ? { home: true } : undefined).then((res) => {
      if (!cancelled) {
        const list = res.items || [];
        setItems(limit ? list.slice(0, limit) : list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [limit, homeOnly]);

  return (
    <section className="relative overflow-hidden bg-prime-night py-20 text-white md:py-28">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 55% 45% at 90% 0%, rgba(172,148,107,0.18), transparent 60%)',
        }}
      />
      <div className="relative mx-auto max-w-prime px-5 sm:px-8">
        {!hideIntro ? (
          <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="prime-eyebrow mb-3 text-prime-gold">{t('home.destinations')}</p>
              <h2 className="font-display text-display-lg text-white">{t('home.destinationsBody')}</h2>
              <KeyLine tone="light" className="mt-7 max-w-[5.5rem]" />
            </div>
            <Link
              to="/compounds"
              className="group inline-flex shrink-0 items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65 transition hover:text-prime-gold"
            >
              {t('home.exploreCompounds')}
              <span className="inline-block h-px w-8 bg-prime-gold transition-all group-hover:w-12" />
            </Link>
          </div>
        ) : null}

        <div className="grid auto-rows-[minmax(240px,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3.5">
          {items.map((c, i) => {
            const isLead = i === 0;
            return (
              <Link
                key={c.id}
                to={`/search?compound=${c.id}`}
                className={cn(
                  'group relative overflow-hidden',
                  isLead && 'min-h-[300px] sm:col-span-2 sm:row-span-2 lg:min-h-0'
                )}
              >
                <img
                  src={c.image}
                  alt={c.name}
                  className="h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.06]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-prime-night via-prime-night/30 to-transparent opacity-90 transition duration-500 group-hover:opacity-95" />
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 p-5 text-white sm:p-6',
                    isLead && 'sm:p-9'
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-prime-gold">
                    {c.region}
                  </p>
                  <h3
                    className={cn(
                      'mt-2.5 font-display font-bold leading-none tracking-[-0.025em]',
                      isLead ? 'text-[2.1rem] sm:text-[3rem]' : 'text-[1.5rem]'
                    )}
                  >
                    {c.name}
                  </h3>
                  <p className="mt-2.5 text-xs font-medium tracking-wide text-white/50">
                    {c.unitCount} stays
                  </p>
                  <span className="mt-5 inline-block h-px w-0 bg-prime-gold transition-all duration-500 group-hover:w-14" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
