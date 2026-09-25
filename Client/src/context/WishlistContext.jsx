import { createContext, useContext, useMemo, useState } from 'react';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try {
      const raw = localStorage.getItem('prime_wishlist');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const value = useMemo(
    () => ({
      ids,
      has(id) {
        return ids.includes(id);
      },
      toggle(id) {
        setIds((prev) => {
          const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
          localStorage.setItem('prime_wishlist', JSON.stringify(next));
          return next;
        });
      },
    }),
    [ids]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
