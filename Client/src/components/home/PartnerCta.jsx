import { Link } from 'react-router-dom';
import { useLocale } from '../../context/LocaleContext';
import Img from '../ui/Img';
import Reveal from '../ui/Reveal';

const IMAGE = 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=2000&q=72';

export default function PartnerCta() {
  const { t } = useLocale();
  return (
    <section className="relative isolate overflow-hidden bg-[#221f20] text-white">
      <Img src={IMAGE} alt="" sizes="100vw" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/40 to-transparent rtl:bg-gradient-to-l" />
      <div className="prime-container py-28 md:py-40">
        <Reveal className="max-w-2xl">
          <p className="prime-eyebrow mb-5 text-prime-gold-soft">{t('home.partnersLabel')}</p>
          <h2 className="font-display text-display-xl font-medium text-balance">{t('home.partnerCtaTitle')}</h2>
          <p className="mt-6 max-w-lg text-[16px] font-light leading-[1.8] text-white/75 md:text-[18px]">
            {t('home.partnerCtaBody')}
          </p>
          <Link to="/owners" className="prime-btn-ghost mt-10">
            {t('home.partnerCtaBtn')}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
