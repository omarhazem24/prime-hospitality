import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Img from '../components/ui/Img';
import { formatMoney } from '../theme/brand';
import { useLocale } from '../context/LocaleContext';
import { formatIsoDate } from '../components/booking/bookingUtils';

function readSummary(state, voucher) {
  if (state?.booking) return state;
  if (!voucher) return null;
  try {
    return JSON.parse(sessionStorage.getItem(`prime.booking.${voucher}`) || 'null');
  } catch {
    return null;
  }
}

export default function BookingSuccessPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { t, localeTag } = useLocale();
  const voucher = params.get('voucher') || params.get('bookingId') || '';
  const summary = useMemo(() => readSummary(location.state, voucher), [location.state, voucher]);
  const booking = summary?.booking;
  const firstName = booking?.primaryGuestName?.split(' ')[0];
  const email = summary?.email;

  const rows = booking
    ? [
        { label: t('bm.destination'), value: booking.destination },
        { label: t('bm.property'), value: booking.property },
        { label: t('bm.roomType'), value: booking.roomType },
        { label: t('bm.arrivalDate'), value: formatIsoDate(booking.arrivalDate, localeTag) },
        { label: t('bm.departureDate'), value: formatIsoDate(booking.departureDate, localeTag) },
        { label: t('bm.nights'), value: booking.nights },
        {
          label: t('bm.guests'),
          value: [
            t('bm.adultsCount', { count: booking.adults }),
            booking.children ? t('bm.childrenCount', { count: booking.children }) : null,
          ]
            .filter(Boolean)
            .join(' · '),
        },
        { label: t('bm.ratePlan'), value: booking.ratePlanName },
      ].filter((r) => r.value !== undefined && r.value !== null && r.value !== '')
    : [];

  return (
    <div>
      <Header />
      <main className="prime-container max-w-3xl pb-28 pt-16 md:pt-24">
        <div className="prime-fade-up text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-prime-gold/50 text-prime-gold">
            <Check size={26} strokeWidth={1.25} aria-hidden />
          </span>
          <p className="prime-eyebrow mt-8 text-prime-gold-deep">{t('bs.eyebrow')}</p>
          <h1 className="mt-5 font-display text-display-lg font-medium text-prime-ink text-balance">
            {firstName ? t('bs.title', { name: firstName }) : t('bs.titleAnon')}
          </h1>
          <p className="prime-lede mx-auto mt-6 max-w-lg">{email ? t('bs.lede', { email }) : t('bs.ledeAnon')}</p>
        </div>

        {voucher && (
          <div className="mt-12 border-y border-prime-line py-8 text-center">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-prime-muted">{t('bs.voucher')}</p>
            <p className="mt-3 font-display text-[2.4rem] font-medium tracking-[0.04em] text-prime-ink md:text-[3rem]">{voucher}</p>
          </div>
        )}

        {booking && (
          <div className="mt-10 grid overflow-hidden bg-prime-surface shadow-premium md:grid-cols-[0.9fr_1.1fr]">
            {summary.image ? (
              <div className="relative min-h-[200px] bg-prime-mist">
                <Img src={summary.image} alt="" sizes="(min-width: 768px) 320px, 100vw" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            ) : null}
            <div className={summary.image ? '' : 'md:col-span-2'}>
              <dl className="px-6 py-3 md:px-8">
                {rows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 border-b border-prime-line py-3.5 text-[15px] last:border-0">
                    <dt className="font-light text-prime-muted">{row.label}</dt>
                    <dd className="m-0 text-end text-prime-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-baseline justify-between gap-4 border-t border-prime-line bg-prime-mist/60 px-6 py-5 md:px-8">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.26em] text-prime-muted">{t('bs.paid')}</span>
                <span className="font-display text-[2rem] font-medium tabular-nums text-prime-ink">
                  {formatMoney(booking.rateAmount, booking.rateCurrency)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link to="/search" className="prime-btn">
            {t('bs.browse')}
          </Link>
          <Link to="/" className="prime-btn-outline">
            {t('bs.home')}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
