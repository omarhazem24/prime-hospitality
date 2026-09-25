import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import KeyLine from '../components/ui/KeyLine';
import { formatDateLabel } from '../utils/cn';

export default function BookingSuccessPage() {
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');

  return (
    <div>
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 py-28 text-center sm:px-8">
        <p className="prime-eyebrow mb-3 text-prime-gold">Request received</p>
        <h1 className="font-display text-display-lg text-prime-ink">
          Thank you{params.get('name') ? `, ${params.get('name')}` : ''}
        </h1>
        <KeyLine className="mx-auto mt-6 max-w-[5.5rem]" />
        <p className="mt-6 text-sm font-medium leading-relaxed text-prime-muted md:text-base">
          Your booking request for <span className="text-prime-ink">{params.get('slug') || 'your stay'}</span>
          {params.get('checkIn')
            ? ` (${formatDateLabel(params.get('checkIn'))} – ${formatDateLabel(params.get('checkOut'))})`
            : ''}{' '}
          has been noted. Our team will confirm shortly.
        </p>
        {bookingId ? (
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-prime-gold">
            Ref · {bookingId}
          </p>
        ) : null}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/search" className="prime-btn">
            Browse more stays
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-prime-line px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-prime-ink transition hover:border-prime-gold"
          >
            Back home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
