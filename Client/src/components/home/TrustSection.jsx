import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLocale } from '../../context/LocaleContext';
import Img from '../ui/Img';
import Reveal from '../ui/Reveal';

const IMAGE = 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=72';

export default function TrustSection() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .getTrust()
      .then((res) => {
        if (!cancelled) setItems(res.items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="prime-section">
      <div className="prime-container grid gap-14 lg:grid-cols-2 lg:gap-24">
        <Reveal className="lg:sticky lg:top-[calc(var(--prime-header-h)+2rem)] lg:self-start">
          <div className="relative aspect-[4/5] overflow-hidden bg-prime-mist">
            <Img src={IMAGE} alt="" sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full object-cover" />
          </div>
        </Reveal>

        <div className="lg:py-10">
          <Reveal>
            <p className="prime-eyebrow mb-5 text-prime-gold-deep">{t('home.why')}</p>
            <h2 className="font-display text-display-lg font-medium text-prime-ink text-balance">{t('home.trustTitle')}</h2>
            <p className="prime-lede mt-6 max-w-md">{t('home.trustBody')}</p>
          </Reveal>

          <ol className="mt-14">
            {items.map((p, i) => (
              <Reveal
                as="li"
                key={p.title}
                delay={i * 80}
                className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-prime-line py-8 last:border-b sm:grid-cols-[5rem_1fr]"
              >
                <span className="font-display text-[2rem] font-medium leading-none text-prime-gold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-[1.6rem] font-medium leading-snug text-prime-ink">
                    {(ar && p.titleAr) || p.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[15px] font-light leading-[1.75] text-prime-muted">
                    {(ar && p.bodyAr) || p.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
