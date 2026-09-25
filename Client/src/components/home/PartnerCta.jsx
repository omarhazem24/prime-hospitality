import { Link } from 'react-router-dom';
import { useLocale } from '../../context/LocaleContext';
import KeyLine from '../ui/KeyLine';

export default function PartnerCta() {
  const { t } = useLocale();
  return (
    <section className="prime-frame relative overflow-hidden bg-prime-night text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 50% 70% at 0% 50%, rgba(172,148,107,0.2), transparent 55%)',
        }}
      />

      <div className="relative mx-auto flex max-w-prime flex-col items-start gap-10 px-5 py-20 sm:px-8 md:flex-row md:items-center md:justify-between md:py-28">
        <div className="max-w-xl">
          <p className="prime-eyebrow mb-4 text-prime-gold">{t('home.partnersLabel')}</p>
          <h2 className="font-display text-display-lg text-white">{t('home.partnerCtaTitle')}</h2>
          <KeyLine tone="light" className="mt-7 max-w-[5.5rem]" />
          <p className="mt-5 text-sm font-medium leading-relaxed text-white/55 md:text-base">
            {t('home.partnerCtaBody')}
          </p>
        </div>
        <Link to="/owners" className="prime-btn-gold shrink-0">
          {t('home.partnerCtaBtn')}
        </Link>
      </div>
    </section>
  );
}
