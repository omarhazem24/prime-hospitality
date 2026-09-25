import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLocale } from '../../context/LocaleContext';
import { cn } from '../../utils/cn';

function PartnerLogo({ partner }) {
  const [failed, setFailed] = useState(false);

  if (failed || !partner.logo) {
    return (
      <span className="font-display text-lg font-bold tracking-wide text-prime-muted md:text-xl">
        {partner.name}
      </span>
    );
  }

  return (
    <img
      src={partner.logo}
      alt={partner.name}
      title={partner.name}
      loading="lazy"
      className="h-7 w-auto max-w-[110px] object-contain opacity-45 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 md:h-9 md:max-w-[130px]"
      onError={() => setFailed(true)}
    />
  );
}

export default function PartnersSection({ className }) {
  const { t } = useLocale();
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .getPartners()
      .then((res) => {
        if (!cancelled) setPartners(res.items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={cn('border-y border-prime-line bg-white py-14 md:py-16', className)}>
      <div className="mx-auto max-w-prime px-5 sm:px-8">
        <p className="prime-eyebrow mb-10 text-center">{t('home.partners')}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8 md:gap-x-20">
          {partners.map((partner) => (
            <div
              key={partner.id || partner.name}
              className="flex h-12 w-[110px] items-center justify-center md:w-[130px]"
            >
              <PartnerLogo partner={typeof partner === 'string' ? { name: partner } : partner} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
