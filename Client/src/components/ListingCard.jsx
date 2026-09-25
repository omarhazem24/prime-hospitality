import { Link } from 'react-router-dom';
import { Bath, BedDouble, Heart, Maximize2, Users } from 'lucide-react';
import { formatMoney } from '../theme/brand';
import { useWishlist } from '../context/WishlistContext';
import { cn } from '../utils/cn';

export function ListingCardSkeleton({ featured = false }) {
  return (
    <div className={cn('animate-pulse overflow-hidden', featured && 'h-full')}>
      <div className={cn('bg-prime-mist', featured ? 'aspect-[4/5] lg:min-h-[420px]' : 'aspect-[4/3]')} />
      <div className="space-y-3 px-1 py-4">
        <div className="h-2.5 w-1/3 rounded bg-prime-mist" />
        <div className="h-5 w-4/5 rounded bg-prime-mist" />
        <div className="h-2.5 w-2/3 rounded bg-prime-mist" />
      </div>
    </div>
  );
}

export default function ListingCard({ listing, priority = false, featured = false }) {
  const { has, toggle } = useWishlist();
  const loved = has(listing.id);
  const img = listing.images?.[0];

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden bg-transparent transition',
        featured && 'lg:min-h-full'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-prime-mist',
          featured ? 'aspect-[4/5] lg:aspect-auto lg:min-h-[420px] lg:flex-1' : 'aspect-[4/3]'
        )}
      >
        <Link to={`/listings/${listing.slug}`} className="absolute inset-0 block">
          <img
            src={img}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-[1000ms] ease-out group-hover:scale-[1.045]"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            referrerPolicy="no-referrer"
          />
        </Link>
        <button
          type="button"
          onClick={() => toggle(listing.id)}
          className={cn(
            'absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-prime-ink shadow-sm backdrop-blur-sm transition hover:bg-white',
            loved && 'text-prime-gold'
          )}
          aria-label={loved ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={15} fill={loved ? 'currentColor' : 'none'} />
        </button>
        <span className="absolute bottom-3 start-3 bg-prime-night/85 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          {listing.propertyType}
        </span>
        {featured ? (
          <span className="absolute start-3 top-3 bg-prime-gold px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-prime-ink">
            Featured
          </span>
        ) : null}
      </div>
      <div className="pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
          {listing.compound} · {listing.region}
        </p>
        <Link to={`/listings/${listing.slug}`}>
          <h3
            className={cn(
              'mt-2 font-display font-bold leading-[1.15] tracking-[-0.025em] text-prime-ink transition group-hover:text-prime-gold-deep',
              featured ? 'text-[1.55rem] md:text-[1.75rem]' : 'text-[1.25rem]'
            )}
          >
            {listing.title}
          </h3>
        </Link>
        <div className="mt-3 flex flex-wrap gap-3.5 text-[11px] font-medium tracking-wide text-prime-muted">
          <span className="inline-flex items-center gap-1">
            <BedDouble size={12} strokeWidth={1.7} /> {listing.bedrooms}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath size={12} strokeWidth={1.7} /> {listing.bathrooms}
          </span>
          <span className="inline-flex items-center gap-1">
            <Maximize2 size={12} strokeWidth={1.7} /> {listing.areaSqm} m²
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={12} strokeWidth={1.7} /> {listing.maxGuests}
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-sm font-semibold tracking-wide text-prime-ink">
            {formatMoney(listing.pricePerNight, listing.currency)}
            <span className="ms-1 font-normal text-prime-muted">/ night</span>
          </p>
          <span className="h-px w-0 bg-prime-gold transition-all duration-500 group-hover:w-10" />
        </div>
      </div>
    </article>
  );
}
