import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Capsule row: All | places in the current destination | Filters
 * Places = compounds filtered by selected region (destination).
 */
export default function PlaceCapsules({
  places,
  selectedId,
  onSelect,
  onOpenFilters,
  className,
}) {
  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      <button
        type="button"
        onClick={() => onSelect('')}
        className={cn(
          'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition',
          !selectedId
            ? 'bg-prime-ink text-prime-sand'
            : 'border border-prime-line bg-prime-surface text-prime-ink hover:border-prime-ink/40'
        )}
      >
        All
      </button>

      <span className="mx-1 h-5 w-px shrink-0 bg-prime-line" aria-hidden />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {places.map((place) => {
          const active = selectedId === place.id;
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => onSelect(active ? '' : place.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition whitespace-nowrap',
                active
                  ? 'border-prime-ink bg-prime-ink text-prime-sand'
                  : 'border-prime-line bg-prime-surface text-prime-ink hover:border-prime-ink/40'
              )}
            >
              {place.name}
            </button>
          );
        })}
        {!places.length ? (
          <span className="shrink-0 text-sm text-prime-muted">No places in this destination</span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpenFilters}
        className="ms-auto flex shrink-0 items-center gap-2 rounded-full border border-prime-line bg-prime-surface px-4 py-2 text-sm font-medium text-prime-ink transition hover:border-prime-ink/40"
      >
        <SlidersHorizontal size={14} strokeWidth={1.8} />
        Filters
      </button>
    </div>
  );
}
