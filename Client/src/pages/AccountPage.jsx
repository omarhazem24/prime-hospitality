import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ListingCard from '../components/ListingCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import api from '../api/client';

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/sign-in" replace />;

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-prime px-5 py-24 sm:px-8 md:py-28">
        <PageHeader
          eyebrow="Account"
          title={`Hello, ${user.name}`}
          lede={user.email}
          actions={
            <div className="flex flex-wrap gap-3">
              <Link to="/wishlist" className="prime-btn-gold">
                Wishlist
              </Link>
              <Link to="/search" className="prime-btn">
                Browse stays
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center border border-prime-line px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-prime-ink transition hover:border-prime-gold"
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
              >
                Sign out
              </button>
            </div>
          }
        />

        <section className="border-t border-prime-line pt-10">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink">
            Upcoming bookings
          </h2>
          <p className="mt-3 max-w-lg text-sm font-medium leading-relaxed text-prime-muted">
            Your confirmed stays will appear here once the PMS connection is live. Until then, browse
            and save homes you love.
          </p>
          <Link
            to="/search"
            className="group mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-prime-ink hover:text-prime-gold-deep"
          >
            Explore stays
            <span className="inline-block h-px w-6 bg-prime-gold transition-all group-hover:w-10" />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function WishlistPage() {
  const { ids } = useWishlist();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.getListings().then((res) => {
      if (!cancelled) setItems((res.items || []).filter((l) => ids.includes(l.id)));
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-prime px-5 py-24 sm:px-8 md:py-28">
        <PageHeader
          eyebrow="Saved"
          title="Wishlist"
          lede="Homes you’re holding onto for the next trip."
        />
        {!items.length ? (
          <div className="border border-dashed border-prime-line bg-white/60 px-8 py-14 text-center">
            <p className="font-display text-2xl font-bold text-prime-ink">No saved stays yet</p>
            <p className="mt-2 text-sm text-prime-muted">Explore the collection and heart the ones you love.</p>
            <Link to="/search" className="prime-btn mt-6 inline-flex">
              Explore stays
            </Link>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((u) => (
              <ListingCard key={u.id} listing={u} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
