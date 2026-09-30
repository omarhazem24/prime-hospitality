import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useLocale } from '../../context/LocaleContext';
import Img from '../ui/Img';
import Reveal from '../ui/Reveal';
import SectionIntro from '../ui/SectionIntro';

const BRANDS = [
  {
    id: 'Inn',
    copyKey: 'home.brandInn',
    fallback: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=72',
  },
  {
    id: 'Residence',
    copyKey: 'home.brandResidence',
    fallback: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=72',
  },
  {
    id: 'Select',
    copyKey: 'home.brandSelect',
    fallback: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=72',
  },
];

export default function BrandsSection() {
  const { t } = useLocale();
  const [images, setImages] = useState({});

  useEffect(() => {
    let cancelled = false;
    api
      .getDestinations()
      .then((res) => {
        if (cancelled) return;
        const found = {};
        (res.items || []).forEach((d) =>
          (d.projects || []).forEach((p) => {
            if (p.brand && p.image && !found[p.brand]) found[p.brand] = p.image;
          })
        );
        setImages(found);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="prime-section bg-prime-mist">
      <div className="prime-container">
        <SectionIntro align="center" eyebrow={t('home.brandsEyebrow')} title={t('home.brandsTitle')} />
        <div className="grid gap-12 md:grid-cols-3 md:gap-6 lg:gap-10">
          {BRANDS.map((b, i) => (
            <Reveal key={b.id} delay={i * 120}>
              <Link to={`/search?brand=${b.id}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-prime-dune md:aspect-[4/5] lg:aspect-[3/4]">
                  <Img
                    src={images[b.id] || b.fallback}
                    alt=""
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="h-full w-full object-cover transition-transform duration-[1600ms] ease-prime group-hover:scale-[1.05]"
                  />
                </div>
                <div className="mt-7 flex items-baseline gap-3">
                  <span className="text-[12px] font-light uppercase tracking-[0.5em] text-prime-muted">Prime</span>
                  <span className="font-display text-[2.4rem] font-medium italic leading-none text-prime-ink">{b.id}</span>
                </div>
                <p className="mt-4 max-w-sm text-[15px] font-light leading-[1.75] text-prime-muted">{t(b.copyKey)}</p>
                <span className="prime-link mt-6">{t('home.explore')}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
