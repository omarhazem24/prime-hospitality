import { brand } from '../theme/brand';

export default function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-prime-sand">
      <img src={brand.logo} alt="" className="h-16 w-auto animate-pulse object-contain opacity-80" />
      <p className="text-sm text-prime-muted">Loading…</p>
    </div>
  );
}
