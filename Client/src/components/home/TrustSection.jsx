import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLocale } from '../../context/LocaleContext';
import KeyLine from '../ui/KeyLine';

export default function TrustSection() {
  const { t } = useLocale();
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
    <section className="relative overflow-hidden bg-prime-mist py-20 md:py-28">
      <div className="mx-auto max-w-prime px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="prime-eyebrow mb-3">{t('home.why')}</p>
            <h2 className="font-display text-display-lg text-prime-ink">{t('home.trustTitle')}</h2>
            <KeyLine className="mt-7 max-w-[5.5rem]" />
            <p className="mt-6 max-w-sm text-sm font-medium leading-relaxed text-prime-muted">
              Quiet luxury. Considered design. Hospitality that feels like a private key.
            </p>
          </div>

          <div className="space-y-0">
            {items.map((p, i) => (
              <div
                key={p.title}
                className="group grid gap-4 border-t border-prime-line py-8 sm:grid-cols-[4.5rem_1fr] sm:gap-8"
              >
                <span className="font-display text-3xl font-bold tracking-[-0.04em] text-prime-gold/45 transition duration-300 group-hover:text-prime-gold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-[1.4rem] font-bold leading-snug tracking-[-0.02em] text-prime-ink">
                    {p.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-prime-muted">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
