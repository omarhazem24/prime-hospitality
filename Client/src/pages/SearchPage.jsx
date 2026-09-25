import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard';
import PlaceCapsules from '../components/search/PlaceCapsules';
import StaysFiltersBar, {
  ActiveFilterPills,
  StaysFiltersSheet,
} from '../components/search/StaysFilters';
import api from '../api/client';
import { cn } from '../utils/cn';

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'beds-desc', label: 'Most bedrooms' },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [compounds, setCompounds] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filters = useMemo(
    () => ({
      compound: params.get('compound') || '',
      propertyType: params.get('propertyType') || '',
      guests: params.get('guests') || '',
      region: params.get('region') || '',
      city: params.get('city') || '',
      beds: params.get('beds') || '',
      checkIn: params.get('checkIn') || '',
      checkOut: params.get('checkOut') || '',
      q: params.get('q') || '',
      sort: params.get('sort') || 'recommended',
    }),
    [params]
  );

  const regions = useMemo(() => {
    const set = new Set(compounds.map((c) => c.region).filter(Boolean));
    return Array.from(set);
  }, [compounds]);

  /** Places (compounds) inside the selected destination — or all when none selected */
  const placeCapsules = useMemo(() => {
    const scoped = filters.region
      ? compounds.filter((c) => c.region === filters.region)
      : compounds;
    return scoped.map((c) => ({ id: c.id, name: c.name, region: c.region }));
  }, [compounds, filters.region]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.compound) n += 1;
    if (filters.region) n += 1;
    if (filters.city) n += 1;
    if (filters.propertyType) n += 1;
    if (filters.guests) n += 1;
    if (filters.beds) n += 1;
    if (filters.checkIn || filters.checkOut) n += 1;
    return n;
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getCompounds(), api.getMeta()])
      .then(([cRes, mRes]) => {
        if (cancelled) return;
        setCompounds(cRes.items || []);
        setPropertyTypes(mRes.propertyTypes || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { sort: _sort, checkIn: _ci, checkOut: _co, ...apiFilters } = filters;
    api
      .getListings(apiFilters)
      .then((res) => {
        if (cancelled) return;
        let next = [...(res.items || [])];
        if (filters.sort === 'price-asc') {
          next.sort((a, b) => a.pricePerNight - b.pricePerNight);
        } else if (filters.sort === 'price-desc') {
          next.sort((a, b) => b.pricePerNight - a.pricePerNight);
        } else if (filters.sort === 'beds-desc') {
          next.sort((a, b) => b.bedrooms - a.bedrooms);
        } else {
          next.sort((a, b) => Number(b.featured) - Number(a.featured));
        }
        setItems(next);
        setTotal(res.total ?? next.length);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  function patchParams(patch) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams();
    if (filters.sort && filters.sort !== 'recommended') next.set('sort', filters.sort);
    setParams(next);
  }

  function removeFilter(key) {
    if (key === 'dates') patchParams({ checkIn: '', checkOut: '' });
    else patchParams({ [key]: '' });
  }

  function selectPlace(placeId) {
    if (!placeId) {
      patchParams({ compound: '' });
      return;
    }
    const place = placeCapsules.find((p) => p.id === placeId) || compounds.find((c) => c.id === placeId);
    patchParams({
      compound: placeId,
      region: place?.region || filters.region || '',
      city: '',
    });
  }

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === filters.sort)?.label || 'Recommended';

  return (
    <div className="min-h-screen bg-prime-sand">
      <Header />
      <main className="pt-16 sm:pt-20 md:pt-[5.5rem]">
        <div className="border-b border-prime-line bg-white/80">
          <div className="mx-auto max-w-prime space-y-3 px-5 py-3 sm:px-8 sm:py-3.5">
            <div className="hidden md:block">
              <StaysFiltersBar
                filters={filters}
                compounds={compounds}
                propertyTypes={propertyTypes}
                regions={regions}
                onChange={patchParams}
                onClear={clearFilters}
              />
            </div>

            <PlaceCapsules
              places={placeCapsules}
              selectedId={filters.compound}
              onSelect={selectPlace}
              onOpenFilters={() => setSheetOpen(true)}
            />
          </div>
        </div>

        <div className="mx-auto max-w-prime px-5 py-4 sm:px-8 sm:py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-prime-muted">
              {loading ? (
                'Searching…'
              ) : (
                <>
                  <span className="font-semibold text-prime-ink">{total}</span>
                  {` stay${total === 1 ? '' : 's'}`}
                  {filters.region ? (
                    <span className="text-prime-muted"> · {filters.region}</span>
                  ) : null}
                </>
              )}
            </p>

            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                className="inline-flex items-center gap-2 border border-prime-line bg-white px-4 py-2.5 text-sm text-prime-ink transition hover:border-prime-gold"
              >
                Sort: {sortLabel}
                <ChevronDown size={14} className={cn(sortOpen && 'rotate-180')} />
              </button>
              {sortOpen ? (
                <div className="absolute end-0 top-full z-20 mt-2 min-w-[220px] overflow-hidden border border-prime-line bg-white py-1 shadow-premium">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        patchParams({ sort: opt.id === 'recommended' ? '' : opt.id });
                        setSortOpen(false);
                      }}
                      className={cn(
                        'block w-full px-4 py-2.5 text-start text-sm transition hover:bg-prime-mist',
                        filters.sort === opt.id
                          ? 'font-semibold text-prime-ink'
                          : 'text-prime-muted'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <ActiveFilterPills
            filters={filters}
            compounds={compounds}
            onRemove={removeFilter}
            onClear={clearFilters}
          />

          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading &&
              Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
            {!loading && items.map((u) => <ListingCard key={u.id} listing={u} />)}
            {!loading && !items.length && (
              <div className="col-span-full border border-dashed border-prime-line bg-white/60 px-8 py-14 text-center">
                <p className="font-display text-2xl font-bold text-prime-ink">No stays match</p>
                <p className="mt-2 text-sm text-prime-muted">
                  Try another destination, city, or clear your filters.
                </p>
                <button type="button" onClick={clearFilters} className="prime-btn mt-6">
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-prime-night/40 backdrop-blur-[2px]"
            aria-label="Close filters backdrop"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-y-0 end-0 w-full max-w-md shadow-2xl">
            <StaysFiltersSheet
              filters={filters}
              compounds={compounds}
              propertyTypes={propertyTypes}
              regions={regions}
              onChange={patchParams}
              onClear={clearFilters}
              onClose={() => setSheetOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
