import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, X } from 'lucide-react';
import ListingDatePicker, {
  formatBookingDate,
  isoToLocalDate,
  localDateToIso,
  sumStayPrices,
} from '../listing/ListingDatePicker';
import KeyLine from '../ui/KeyLine';
import { formatMoney } from '../../theme/brand';
import { useLocale } from '../../context/LocaleContext';
import { cn } from '../../utils/cn';

/**
 * Slide-over booking panel: dates (dropdown calendar), guests, stay total → checkout.
 */
export default function BookingDrawer({
  open,
  onClose,
  listing,
  blockedDates = [],
  checkoutDates = [],
  dailyPrices = {},
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuests = 2,
  onConfirm,
}) {
  const { t, localeTag } = useLocale();
  const datesAnchorRef = useRef(null);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [calOpen, setCalOpen] = useState(false);

  const maxGuests = listing?.maxGuests || 8;

  useEffect(() => {
    if (!open) return undefined;
    setCheckIn(initialCheckIn || '');
    setCheckOut(initialCheckOut || '');
    setGuests(Math.min(Math.max(1, initialGuests || 2), maxGuests));
    setCalOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, initialCheckIn, initialCheckOut, initialGuests, maxGuests]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const rangeValue = useMemo(
    () => ({
      start: isoToLocalDate(checkIn),
      end: isoToLocalDate(checkOut),
    }),
    [checkIn, checkOut]
  );

  const stayQuote = useMemo(
    () => sumStayPrices(rangeValue.start, rangeValue.end, dailyPrices),
    [rangeValue, dailyPrices]
  );

  const displayFrom = useMemo(() => {
    if (!listing) return null;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    if (dailyPrices[iso] != null) return dailyPrices[iso];
    const next = Object.keys(dailyPrices)
      .sort()
      .find((k) => k >= iso);
    return next != null ? dailyPrices[next] : listing.pricePerNight;
  }, [dailyPrices, listing]);

  function onRangeChange({ start, end }) {
    setCheckIn(localDateToIso(start));
    setCheckOut(localDateToIso(end));
    if (start && end) setCalOpen(false);
  }

  function handleConfirm(e) {
    e.preventDefault();
    if (!checkIn || !checkOut) return;
    onConfirm?.({ checkIn, checkOut, guests });
  }

  if (!open || !listing || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[240] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-prime-night/50 backdrop-blur-[2px] transition animate-[primeFadeIn_0.25s_var(--prime-ease)_both]"
        aria-label={t('common.close')}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-drawer-title"
        className="relative flex h-full w-full max-w-full flex-col border-s border-prime-line bg-prime-surface shadow-[-24px_0_64px_rgba(34,31,32,0.18)] animate-[primeSlideIn_0.35s_var(--prime-ease)_both] sm:max-w-[28rem] lg:max-w-[32rem]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-prime-line px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-prime-muted">
              {t('booking.drawerEyebrow')}
            </p>
            <h2
              id="booking-drawer-title"
              className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] text-prime-ink sm:text-2xl"
            >
              {listing.title}
            </h2>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-[-0.03em] text-prime-ink">
              {formatMoney(displayFrom, listing.currency)}
              <span className="ms-1 text-sm font-sans font-normal tracking-normal text-prime-muted">
                / night
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center border border-prime-line text-prime-ink transition hover:border-prime-gold"
            aria-label={t('common.close')}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <form
          id="prime-booking-drawer"
          onSubmit={handleConfirm}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="relative">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
                {t('common.dates')}
              </span>
              <button
                ref={datesAnchorRef}
                type="button"
                onClick={() => setCalOpen((o) => !o)}
                aria-expanded={calOpen}
                className={cn(
                  'grid w-full grid-cols-2 gap-0 border text-start transition focus:outline-none focus-visible:ring-2 focus-visible:ring-prime-gold',
                  calOpen ? 'border-prime-gold' : 'border-prime-line hover:border-prime-gold'
                )}
              >
                <div className={cn('px-3.5 py-3', rangeValue.start && 'bg-prime-gold/8')}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-prime-muted">
                    {t('home.arrive')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-prime-ink">
                    {formatBookingDate(rangeValue.start, t('common.addDate'), localeTag)}
                  </p>
                </div>
                <div
                  className={cn(
                    'border-s border-prime-line px-3.5 py-3',
                    rangeValue.end && 'bg-prime-gold/8'
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-prime-muted">
                    {t('home.depart')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-prime-ink">
                    {formatBookingDate(rangeValue.end, t('common.addDate'), localeTag)}
                  </p>
                </div>
              </button>

              {calOpen && (
                <ListingDatePicker
                  value={rangeValue}
                  onChange={onRangeChange}
                  onClose={() => setCalOpen(false)}
                  anchorRef={datesAnchorRef}
                  months={2}
                  blockedDates={blockedDates}
                  checkoutDates={checkoutDates}
                  dailyPrices={dailyPrices}
                  minNights={1}
                />
              )}
            </div>

            <div>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
                {t('home.searchGuests')}
              </span>
              <div className="flex items-center justify-between border border-prime-line px-3.5 py-2.5">
                <span className="text-sm font-medium text-prime-ink">
                  {t('common.guestsCount', { count: guests })}
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label={t('booking.decreaseGuests')}
                    disabled={guests <= 1}
                    onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    className="grid h-9 w-9 place-items-center border border-prime-line text-prime-ink transition hover:border-prime-gold disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Minus size={16} strokeWidth={1.75} />
                  </button>
                  <span className="min-w-[1.75rem] text-center font-display text-lg font-bold tabular-nums text-prime-ink">
                    {guests}
                  </span>
                  <button
                    type="button"
                    aria-label={t('booking.increaseGuests')}
                    disabled={guests >= maxGuests}
                    onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                    className="grid h-9 w-9 place-items-center border border-prime-line text-prime-ink transition hover:border-prime-gold disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Plus size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-prime-muted">
                {t('booking.maxGuests', { count: maxGuests })}
              </p>
            </div>

            {stayQuote && (
              <div className="border border-prime-line bg-prime-sand/90 px-4 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-prime-muted">
                      {t('listing.totalStay')}
                    </p>
                    <p className="mt-0.5 text-xs text-prime-muted">
                      {t('listing.nightsTotal', { nights: stayQuote.nights })}
                    </p>
                  </div>
                  <p className="font-display text-2xl font-bold tabular-nums tracking-[-0.02em] text-prime-ink">
                    {formatMoney(stayQuote.total, listing.currency)}
                  </p>
                </div>
                <KeyLine className="mt-3 max-w-[3.5rem]" />
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-prime-line bg-prime-surface px-5 py-4 sm:px-6">
            <button
              type="submit"
              className="prime-btn w-full"
              disabled={!checkIn || !checkOut}
            >
              {t('booking.continue')}
            </button>
            <p className="mt-2.5 text-center text-[11px] text-prime-muted">{t('booking.noChargeYet')}</p>
          </footer>
        </form>
      </aside>
    </div>,
    document.body
  );
}
