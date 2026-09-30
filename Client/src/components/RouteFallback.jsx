import { brand } from '../theme/brand';

export default function RouteFallback() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-prime-sand" role="status" aria-label="Loading">
      <img
        src={brand.logoDark}
        alt=""
        width="180"
        height="64"
        className="h-12 w-auto animate-pulse object-contain opacity-70 dark:hidden"
      />
      <img
        src={brand.logoLight}
        alt=""
        width="180"
        height="64"
        className="hidden h-12 w-auto animate-pulse object-contain opacity-70 dark:block"
      />
    </div>
  );
}
