import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Heart, X } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BookingDrawer from '../components/booking/BookingDrawer';
import ListingCard from '../components/ListingCard';
import KeyLine from '../components/ui/KeyLine';
import PageHeader from '../components/ui/PageHeader';
import api from '../api/client';
import { GUEST_AVAILABILITY_MONTHS } from '../constants/availability';
import { brand, formatMoney, listingWhatsAppMessage, whatsappHref } from '../theme/brand';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useWishlist } from '../context/WishlistContext';
import { cn } from '../utils/cn';

const GUEST_REGULATION_KEYS = [
  'listing.reg0',
  'listing.reg1',
  'listing.reg2',
  'listing.reg3',
  'listing.reg4',
];

function localISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function Spec({ num, label }) {
  return (
    <div className="border border-prime-line bg-prime-surface px-3 py-4 text-center">
      <div className="font-display text-[1.65rem] font-bold leading-none tracking-[-0.03em] text-prime-ink">
        {num}
      </div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-prime-muted">
        {label}
      </div>
    </div>
  );
}

function ExpandableText({ text, limit = 320 }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const needs = text.length > limit;
  const shown = !needs || open ? text : `${text.slice(0, limit).trim()}…`;
  return (
    <div>
      <p className="m-0 whitespace-pre-line text-[15px] leading-relaxed text-prime-ink/85">{shown}</p>
      {needs && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-sm font-semibold text-prime-ink underline underline-offset-4 decoration-prime-gold/60 hover:decoration-prime-gold"
        >
          {open ? t('listing.showLess') : t('listing.readMore')}
        </button>
      )}
    </div>
  );
}

function CheckRow({ children }) {
  return (
    <div className="flex items-start gap-3 text-[14.5px] text-prime-ink">
      <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-prime-gold" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export default function ListingDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, localeTag } = useLocale();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [checkoutDates, setCheckoutDates] = useState([]);
  const [dailyPrices, setDailyPrices] = useState({});
  const [similar, setSimilar] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: '' });
  const [reviewMessage, setReviewMessage] = useState('');

  const seedGuests = Number(searchParams.get('guests')) || 2;
  const seedCheckIn = searchParams.get('checkIn') || '';
  const seedCheckOut = searchParams.get('checkOut') || '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .getListingBySlug(slug)
      .then((res) => {
        if (cancelled) return;
        setListing(res.item);
        setReviews(res.item?.reviews || []);
      })
      .catch(() => {
        if (!cancelled) setError('This stay could not be found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!listing) return undefined;
    let cancelled = false;
    const from = localISO(new Date());
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + GUEST_AVAILABILITY_MONTHS);
    const to = localISO(toDate);

    api
      .getListingAvailability(slug, { from, to })
      .then((data) => {
        if (cancelled) return;
        const nights = (data.blocked || []).map((b) => b.date);
        const occupied = new Set(nights);
        const turnover = (data.checkout_dates || []).filter((d) => !occupied.has(d));
        setBlocked(nights);
        setCheckoutDates(turnover);
      })
      .catch(() => {
        if (!cancelled) {
          setBlocked([]);
          setCheckoutDates([]);
        }
      });

    api
      .getListingPricing(slug, { from, to })
      .then((data) => {
        if (!cancelled) setDailyPrices(data.prices || {});
      })
      .catch(() => {
        if (!cancelled) setDailyPrices({});
      });

    return () => {
      cancelled = true;
    };
  }, [slug, listing]);

  useEffect(() => {
    if (!listing) return undefined;
    let cancelled = false;
    api
      .getListings({ compound: listing.compoundId || listing.compound, limit: 6 })
      .then((res) => {
        if (cancelled) return;
        const items = (res.items || []).filter((l) => l.slug !== listing.slug).slice(0, 3);
        setSimilar(items);
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => {
      cancelled = true;
    };
  }, [listing]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setLightbox(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [lightbox]);

  const photos = listing?.images || [];
  const amenities = listing?.amenities || [];
  const facilities = listing?.facilities || [];

  const locationParts = useMemo(() => {
    if (!listing) return [];
    return [
      ...new Map(
        [listing.compound, listing.city, listing.region]
          .filter((p) => p && String(p).trim())
          .map((p) => [String(p).trim().toLowerCase(), String(p).trim()])
      ).values(),
    ];
  }, [listing]);

  const displayFromPrice = useMemo(() => {
    const today = localISO();
    if (dailyPrices[today] != null) return dailyPrices[today];
    const next = Object.keys(dailyPrices)
      .sort()
      .find((iso) => iso >= today);
    if (next != null) return dailyPrices[next];
    return listing?.pricePerNight;
  }, [dailyPrices, listing]);

  const detailRows = useMemo(() => {
    if (!listing) return [];
    return [
      { label: t('listing.specGuests'), value: String(listing.maxGuests || '—') },
      { label: t('listing.specBedrooms'), value: String(listing.bedrooms ?? '—') },
      { label: t('listing.specBaths'), value: String(listing.bathrooms ?? '—') },
      { label: t('listing.specArea'), value: listing.areaSqm ? `${listing.areaSqm} m²` : '—' },
      { label: t('listing.specCheckIn'), value: t('listing.specCheckInValue') },
      { label: t('listing.specCheckOut'), value: t('listing.specCheckOutValue') },
      ...(listing.propertyType
        ? [{ label: t('listing.specPropertyType'), value: listing.propertyType }]
        : []),
    ];
  }, [listing, t]);

  const averageRating =
    listing?.averageRating ??
    (reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0);
  const reviewCount = listing?.reviewCount ?? reviews.length;

  function confirmBooking({ checkIn, checkOut, guests }) {
    if (!listing) return;
    setDrawerOpen(false);
    const q = new URLSearchParams({
      slug: listing.slug,
      guests: String(guests),
      checkIn,
      checkOut,
    });
    navigate(`/checkout?${q.toString()}`);
  }

  function submitReview(e) {
    e.preventDefault();
    if (!user) return;
    const comment = reviewDraft.comment.trim();
    if (!comment) {
      setReviewMessage(t('listing.reviewNeedComment'));
      return;
    }
    const guestName = user.name || user.email || t('common.guest');
    const next = {
      id: `local-${Date.now()}`,
      guestName,
      rating: Number(reviewDraft.rating) || 5,
      comment,
      createdAt: localISO(),
    };
    setReviews((prev) => [next, ...prev]);
    setReviewDraft({ rating: 5, comment: '' });
    setReviewMessage(t('listing.thanksReview'));
  }

  if (loading) {
    return (
      <div>
        <Header />
        <div className="mx-auto max-w-prime px-5 py-32 text-prime-muted sm:px-8">{t('listing.loading')}</div>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div>
        <Header />
        <main className="mx-auto max-w-prime px-5 py-28 text-center sm:px-8">
          <PageHeader title={t('listing.notFound')} lede={error || t('listing.unavailable')} />
          <Link to="/search" className="prime-btn mt-2 inline-flex">
            {t('listing.browseStays')}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const loved = has(listing.id);
  const waHref = whatsappHref(listingWhatsAppMessage(`/listings/${listing.slug}`));

  return (
    <div>
      <Header />
      <main className="pb-28 pt-20 lg:pb-0">
        <div className="mx-auto max-w-prime px-5 sm:px-8">
          {/* Breadcrumb */}
          <div className="py-4 text-[13px] text-prime-muted">
            <Link to="/" className="transition hover:text-prime-ink">
              {t('listing.egypt')}
            </Link>
            {locationParts.map((part) => (
              <span key={part}>
                {' · '}
                <Link
                  to={`/search?q=${encodeURIComponent(part)}`}
                  className="transition hover:text-prime-ink"
                >
                  {part}
                </Link>
              </span>
            ))}
            {' · '}
            <span className="text-prime-ink/70">{listing.title}</span>
          </div>

          {/* Title */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              {locationParts[0] && <p className="prime-eyebrow mb-2.5">{locationParts[0]}</p>}
              <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.03em] text-prime-ink">
                {listing.title}
              </h1>
              <p className="mt-2.5 text-sm text-prime-muted">
                <strong className="font-semibold text-prime-ink">
                  {locationParts[0] || t('listing.egypt')}
                </strong>
                {locationParts.length > 1 ? `, ${locationParts.slice(1).join(', ')}` : ''}
              </p>
              {reviewCount > 0 && (
                <p className="mt-2 text-sm text-prime-ink">
                  <span className="font-semibold text-prime-gold-deep">★ {averageRating.toFixed(1)}</span>
                  <span className="text-prime-muted">
                    {' '}
                    · {t('listing.reviewCount', { count: reviewCount })}
                  </span>
                </p>
              )}
              <KeyLine className="mt-5 max-w-[5rem]" />
            </div>
            <button
              type="button"
              onClick={() => toggle(listing.id)}
              className={cn(
                'inline-flex items-center gap-2 border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition',
                loved
                  ? 'border-prime-gold bg-prime-gold/10 text-prime-gold-deep'
                  : 'border-prime-line bg-prime-surface text-prime-ink hover:border-prime-gold'
              )}
            >
              <Heart size={15} fill={loved ? 'currentColor' : 'none'} />
              {loved ? t('listing.saved') : t('listing.save')}
            </button>
          </div>

          {/* Gallery */}
          <div className="relative mb-8">
            <div className="hidden overflow-hidden md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[220px_220px] md:gap-2 lg:grid-rows-[240px_240px]">
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="relative row-span-2 overflow-hidden bg-prime-mist text-start"
              >
                <img
                  src={photos[0]}
                  alt={listing.title}
                  fetchPriority="high"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-[1.03]"
                />
              </button>
              {photos.slice(1, 5).map((src, i) => (
                <button
                  type="button"
                  key={`${src}-${i}`}
                  onClick={() => setLightbox(true)}
                  className="relative overflow-hidden bg-prime-mist"
                >
                  <img
                    src={src}
                    alt={t('listing.photoAlt', { title: listing.title, n: i + 2 })}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-[1.04]"
                  />
                </button>
              ))}
            </div>

            <div className="-mx-5 flex gap-2 overflow-x-auto scroll-smooth px-5 pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
              {photos.slice(0, 8).map((src, i) => (
                <button
                  type="button"
                  key={`${src}-m-${i}`}
                  onClick={() => setLightbox(true)}
                  className="relative aspect-[4/3] w-[88%] flex-none snap-start overflow-hidden bg-prime-mist"
                >
                  <img
                    src={src}
                    alt={i === 0 ? listing.title : t('listing.photoAlt', { title: listing.title, n: i + 1 })}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="absolute bottom-4 end-4 border border-prime-line bg-prime-surface/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-prime-ink shadow-sm backdrop-blur-sm transition hover:border-prime-gold"
            >
              {t('listing.showAllPhotos', { count: photos.length })}
            </button>
          </div>

          {/* Section nav */}
          <nav className="sticky top-[4.5rem] z-30 mb-8 hidden border-y border-prime-line bg-prime-sand/95 backdrop-blur-md md:block">
            <div className="flex gap-7 text-[13px] font-semibold text-prime-muted">
              {[
                ['#about', t('listing.description')],
                ['#details', t('listing.details')],
                ['#features', t('listing.amenitiesHeading')],
                ['#reviews', t('listing.reviews')],
                ['#rules', t('listing.houseRules')],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="py-3 transition hover:text-prime-ink"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div className="grid grid-cols-1 gap-12 pb-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
            <div className="min-w-0">
              <section className="mb-8 border-b border-prime-line pb-8">
                <div className="grid grid-cols-3 gap-3">
                  <Spec num={String(listing.maxGuests || '—')} label={t('listing.specGuests')} />
                  <Spec num={String(listing.bedrooms ?? '—')} label={t('listing.specBedrooms')} />
                  <Spec num={String(listing.bathrooms ?? '—')} label={t('listing.specBaths')} />
                </div>
              </section>

              <section id="about" className="mb-8 scroll-mt-36 border-b border-prime-line pb-8">
                <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink">
                  {t('listing.description')}
                </h2>
                <KeyLine className="mt-3 max-w-[3.5rem]" />
                <div className="mt-5">
                  <ExpandableText text={listing.description} />
                </div>
              </section>

              <section id="details" className="mb-8 scroll-mt-36 border-b border-prime-line pb-8">
                <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink">
                  {t('listing.details')}
                </h2>
                <KeyLine className="mt-3 max-w-[3.5rem]" />
                <dl className="mt-5 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                  {detailRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between gap-4 border-b border-prime-line py-2.5 text-[14.5px]"
                    >
                      <dt className="text-prime-muted">{row.label}</dt>
                      <dd className="m-0 text-end font-semibold text-prime-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section id="features" className="mb-8 scroll-mt-36 border-b border-prime-line pb-8">
                <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink">
                  {t('listing.features')}
                </h2>
                <KeyLine className="mt-3 max-w-[3.5rem]" />

                {!!amenities.length && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                      {t('listing.amenitiesHeading')}
                    </h3>
                    <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {amenities.map((a) => (
                        <CheckRow key={a}>{a}</CheckRow>
                      ))}
                    </div>
                  </div>
                )}

                {!!facilities.length && (
                  <div>
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                      {t('listing.facilities')}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {facilities.map((f) => (
                        <CheckRow key={f}>{f}</CheckRow>
                      ))}
                    </div>
                  </div>
                )}

                {!amenities.length && !facilities.length && (
                  <p className="mt-5 text-sm text-prime-muted">{t('listing.amenitiesEmpty')}</p>
                )}
              </section>

              <section id="reviews" className="mb-8 scroll-mt-36 border-b border-prime-line pb-8">
                <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink">
                  {t('listing.reviews')}
                </h2>
                <KeyLine className="mt-3 max-w-[3.5rem]" />
                <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    {user ? (
                      <form onSubmit={submitReview} className="space-y-3 border border-prime-line bg-prime-surface p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-prime-muted">
                          {t('listing.writeReview')}
                        </p>
                        <label className="block">
                          <span className="mb-1 block text-xs text-prime-muted">{t('listing.rating')}</span>
                          <select
                            className="prime-input"
                            value={reviewDraft.rating}
                            onChange={(e) =>
                              setReviewDraft((d) => ({ ...d, rating: Number(e.target.value) }))
                            }
                          >
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <textarea
                          className="prime-input min-h-[100px] resize-y"
                          placeholder={t('listing.reviewPlaceholder')}
                          value={reviewDraft.comment}
                          onChange={(e) => setReviewDraft((d) => ({ ...d, comment: e.target.value }))}
                        />
                        <button type="submit" className="prime-btn w-full">
                          {t('listing.submitReview')}
                        </button>
                      </form>
                    ) : (
                      <div className="border border-prime-line bg-prime-mist/50 p-5 text-sm text-prime-ink">
                        {t('listing.signInReviewPrefix')}{' '}
                        <Link to="/sign-in" className="font-semibold underline underline-offset-4">
                          {t('listing.signIn')}
                        </Link>{' '}
                        {t('listing.signInReviewSuffix')}
                      </div>
                    )}
                    {reviewMessage ? (
                      <p className="mt-3 text-sm text-prime-gold-deep">{reviewMessage}</p>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {reviewCount > 0 && (
                      <p className="text-sm text-prime-ink">
                        <span className="font-semibold text-prime-gold-deep">★ {averageRating.toFixed(1)}</span>
                        <span className="text-prime-muted">
                          {' '}
                          · {t('listing.reviewCount', { count: reviews.length })}
                        </span>
                      </p>
                    )}
                    {reviews.length === 0 ? (
                      <p className="text-sm text-prime-muted">{t('listing.noReviews')}</p>
                    ) : (
                      reviews.map((rev) => (
                        <article key={rev.id} className="border-b border-prime-line pb-4 last:border-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-semibold text-prime-ink">{rev.guestName}</p>
                            <p className="text-xs text-prime-muted">
                              {rev.createdAt
                                ? new Date(`${rev.createdAt}T00:00:00`).toLocaleDateString(localeTag, {
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : null}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-prime-gold-deep">
                            {'★'.repeat(Math.round(rev.rating || 0))}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-prime-ink/80">{rev.comment}</p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {similar.length > 0 && (
                <section className="mb-8 border-b border-prime-line pb-8">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink">
                        {t('listing.similarRent')}
                      </h2>
                      <KeyLine className="mt-3 max-w-[3.5rem]" />
                    </div>
                    <Link
                      to="/search"
                      className="text-[11px] font-semibold uppercase tracking-[0.16em] text-prime-muted transition hover:text-prime-ink"
                    >
                      {t('listing.viewAll')}
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {similar.map((item) => (
                      <ListingCard key={item.id} listing={item} />
                    ))}
                  </div>
                </section>
              )}

              <section id="rules" className="mb-8 scroll-mt-36 border-b border-prime-line pb-8">
                <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink">
                  {t('listing.houseRules')}
                </h2>
                <KeyLine className="mt-3 max-w-[3.5rem]" />
                <ul className="mt-5 space-y-2.5 p-0 text-sm">
                  <li>
                    <CheckRow>{t('listing.checkInAfter')}</CheckRow>
                  </li>
                  <li>
                    <CheckRow>{t('listing.checkOutBefore')}</CheckRow>
                  </li>
                  <li>
                    <CheckRow>{t('listing.noSmoking')}</CheckRow>
                  </li>
                  <li>
                    <CheckRow>{t('listing.noParties')}</CheckRow>
                  </li>
                  <li>
                    <CheckRow>{t('listing.guestsMax', { count: listing.maxGuests || 8 })}</CheckRow>
                  </li>
                </ul>
              </section>

              <section className="mb-4 pb-4">
                <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink">
                  {t('listing.guestRegulations')}
                </h2>
                <KeyLine className="mt-3 max-w-[3.5rem]" />
                <ul className="mt-5 space-y-3 p-0 text-sm">
                  {GUEST_REGULATION_KEYS.map((key) => (
                    <li key={key}>
                      <CheckRow>{t(key)}</CheckRow>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <aside className="hidden h-fit border border-prime-line bg-prime-surface p-6 lg:sticky lg:top-28 lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-prime-muted">
                {t('listing.reservation')}
              </p>
              <p className="mt-3 font-display text-3xl font-bold tracking-[-0.03em] text-prime-ink">
                {formatMoney(displayFromPrice, listing.currency)}
                <span className="ms-1 text-sm font-sans font-normal tracking-normal text-prime-muted">
                  / night
                </span>
              </p>
              <KeyLine className="mt-5 max-w-[4rem]" />
              <div className="mt-6 flex flex-col gap-3">
                <button type="button" className="prime-btn w-full" onClick={() => setDrawerOpen(true)}>
                  {t('listing.bookNow')}
                </button>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 border border-prime-line py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-prime-ink transition hover:border-prime-gold"
                >
                  {t('listing.whatsappInquiry')}
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-prime-line bg-prime-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-prime items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold tabular-nums tracking-[-0.02em] text-prime-ink">
              {formatMoney(displayFromPrice, listing.currency)}
              <span className="ms-1 text-[11px] font-sans font-normal tracking-normal text-prime-muted">
                / night
              </span>
            </p>
          </div>
          <button type="button" className="prime-btn shrink-0 px-5 py-3" onClick={() => setDrawerOpen(true)}>
            {t('listing.bookNow')}
          </button>
        </div>
      </div>

      <BookingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        listing={listing}
        blockedDates={blocked}
        checkoutDates={checkoutDates}
        dailyPrices={dailyPrices}
        initialCheckIn={seedCheckIn}
        initialCheckOut={seedCheckOut}
        initialGuests={seedGuests}
        onConfirm={confirmBooking}
      />

      {lightbox && (
        <div className="fixed inset-0 z-[280] flex flex-col bg-prime-night/95">
          <div className="flex items-center justify-between px-5 py-4 text-prime-sand sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              {t('listing.showAllPhotos', { count: photos.length })}
            </p>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="grid h-10 w-10 place-items-center border border-white/25 text-prime-sand transition hover:border-prime-gold hover:text-prime-gold"
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-10 sm:px-8">
            <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2">
              {photos.map((src, i) => (
                <div
                  key={`lb-${src}-${i}`}
                  className={cn('overflow-hidden bg-prime-charcoal', i === 0 && 'md:col-span-2')}
                >
                  <img
                    src={src}
                    alt={t('listing.photoAlt', { title: listing.title, n: i + 1 })}
                    className="w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
