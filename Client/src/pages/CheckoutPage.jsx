import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import PageHeader from '../components/ui/PageHeader';
import KeyLine from '../components/ui/KeyLine';
import BookingForm from '../components/booking/BookingForm';
import PaymentModal from '../components/booking/PaymentModal';
import UnitCalendar from '../components/booking/UnitCalendar';
import useKwentraCalendar from '../hooks/useKwentraCalendar';
import { kwentraApi } from '../services/api';
import { formatMoney } from '../theme/brand';
import { formatDateLabel } from '../utils/cn';

/**
 * On-site checkout — calendar, guest form, embedded payment.
 * Zero redirects to Kwentra or external checkout hosts.
 */
export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const slug = params.get('slug');
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payment, setPayment] = useState(null);
  const [booking, setBooking] = useState(null);
  const [guests, setGuests] = useState(Number(params.get('guests')) || 2);

  const cal = useKwentraCalendar({ slug, enabled: Boolean(slug) });

  useEffect(() => {
    if (!slug) return;
    kwentraApi
      .getListingBySlug(slug)
      .then((res) => setListing(res.item))
      .catch(() => setListing(null));
  }, [slug]);

  useEffect(() => {
    const ci = params.get('checkIn') || '';
    const co = params.get('checkOut') || '';
    if (ci) cal.setCheckIn(ci);
    if (co) cal.setCheckOut(co);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function onGuestSubmit(guest) {
    if (!cal.checkIn || !cal.checkOut) {
      setError('Select check-in and check-out dates');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const data = await kwentraApi.bookDirect({
        slug,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        notes: guest.notes,
        guests,
        checkIn: cal.checkIn,
        checkOut: cal.checkOut,
        amount: cal.quote?.total || undefined,
        currency: cal.currency || listing?.currency || 'EGP',
      });
      setBooking(data.booking);
      setPayment(data.payment);
      setPaymentOpen(true);
    } catch (err) {
      setError(err.message || 'Could not start booking');
    } finally {
      setSubmitting(false);
    }
  }

  function onPaid({ bookingId }) {
    setPaymentOpen(false);
    const q = new URLSearchParams({
      slug: slug || '',
      name: booking?.name || '',
      checkIn: cal.checkIn || '',
      checkOut: cal.checkOut || '',
      bookingId: bookingId || booking?.id || '',
    });
    navigate(`/booking-success?${q.toString()}`);
  }

  const displayAmount = cal.quote?.total || listing?.pricePerNight || 0;

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-prime px-5 py-24 sm:px-8 md:py-28">
        <PageHeader
          eyebrow="Direct booking"
          title="Complete your stay"
          lede="Search, dates, guest details, and payment — all on Prime. No redirects to external booking engines."
        />

        {!slug ? (
          <p className="text-prime-muted">
            No stay selected.{' '}
            <Link to="/search" className="font-medium text-prime-ink underline-offset-4 hover:underline">
              Browse stays
            </Link>
          </p>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
            <div className="space-y-8">
              <section className="border border-prime-line bg-white p-5 sm:p-6">
                <h2 className="font-display text-lg font-bold text-prime-ink">Select dates</h2>
                <div className="mt-4">
                  <UnitCalendar
                    checkIn={cal.checkIn}
                    checkOut={cal.checkOut}
                    blockedDates={cal.blockedDates}
                    checkoutDates={cal.checkoutDates}
                    dailyPrices={cal.dailyPrices}
                    loading={cal.loading}
                    error={cal.error}
                    onChange={({ checkIn, checkOut }) => {
                      cal.setCheckIn(checkIn);
                      cal.setCheckOut(checkOut);
                    }}
                  />
                </div>
                <label className="mt-5 block max-w-[12rem]">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
                    Guests
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={listing?.maxGuests || 16}
                    className="prime-input"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value) || 1)}
                  />
                </label>
              </section>

              <section className="border border-prime-line bg-white p-5 sm:p-6">
                <h2 className="font-display text-lg font-bold text-prime-ink">Guest details</h2>
                <div className="mt-4">
                  <BookingForm submitting={submitting} error={error} onSubmit={onGuestSubmit} />
                </div>
              </section>
            </div>

            <aside className="h-fit border border-prime-line bg-white p-5 lg:sticky lg:top-24">
              {listing ? (
                <>
                  <img
                    src={listing.images?.[0]}
                    alt=""
                    className="mb-5 aspect-video w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-prime-ink">
                    {listing.title}
                  </h2>
                  <p className="mt-1 text-sm text-prime-muted">{listing.compound}</p>
                  <KeyLine className="mt-5 max-w-[4rem]" />
                  <p className="mt-5 text-sm font-medium text-prime-muted">
                    {formatDateLabel(cal.checkIn)} → {formatDateLabel(cal.checkOut)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-prime-ink">Guests: {guests}</p>
                  {cal.quote?.nights ? (
                    <p className="mt-5 font-display text-2xl font-bold text-prime-ink">
                      {formatMoney(cal.quote.total, cal.currency || listing.currency)}
                      <span className="ms-1 text-sm font-sans font-normal text-prime-muted">
                        · {cal.quote.nights} night{cal.quote.nights === 1 ? '' : 's'}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-5 font-display text-2xl font-bold text-prime-ink">
                      {formatMoney(listing.pricePerNight, listing.currency)}
                      <span className="ms-1 text-sm font-sans font-normal text-prime-muted">/ night</span>
                    </p>
                  )}
                  {cal.source ? (
                    <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-prime-muted">
                      Calendar: {cal.source}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-prime-muted">Loading stay…</p>
              )}
            </aside>
          </div>
        )}
      </main>
      <Footer />

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        payment={payment}
        booking={booking}
        amount={booking?.amount || displayAmount}
        currency={booking?.currency || cal.currency || listing?.currency || 'EGP'}
        onPaid={onPaid}
      />
    </div>
  );
}
