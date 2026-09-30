import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy /checkout links → the listing page with the booking popup open */
export default function CheckoutPage() {
  const [params] = useSearchParams();
  const slug = params.get('slug');
  if (!slug) return <Navigate to="/search" replace />;
  const q = new URLSearchParams({ book: '1' });
  ['checkIn', 'checkOut', 'adults', 'children'].forEach((key) => {
    if (params.get(key)) q.set(key, params.get(key));
  });
  if (!q.has('adults') && params.get('guests')) q.set('adults', params.get('guests'));
  return <Navigate to={`/listings/${encodeURIComponent(slug)}?${q.toString()}`} replace />;
}
