import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BedDouble,
  Building2,
  ChevronDown,
  MapPin,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import DateRangePicker, { formatStayDate } from '../ui/DateRangePicker';
import { useLocale } from '../../context/LocaleContext';
import { cn } from '../../utils/cn';

const BED_OPTIONS = [0, 1, 2, 3, 4, 5];

function Dropdown({
  label,
  icon: Icon,
  valueLabel,
  open,
  onToggle,
  children,
  className,
  panelClassName,
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex h-full w-full items-center gap-3 px-4 py-3.5 text-start transition hover:bg-prime-mist/70 sm:px-5',
          open && 'bg-prime-mist/80'
        )}
      >
        {Icon ? (
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center border border-prime-line bg-white text-prime-gold sm:flex">
            <Icon size={15} strokeWidth={1.8} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
            {label}
            <ChevronDown size={12} className={cn('opacity-60 transition', open && 'rotate-180')} />
          </span>
          <span className="mt-1 block truncate text-sm font-medium text-prime-ink">{valueLabel}</span>
        </span>
      </button>
      {open ? (
        <div
          className={cn(
            'absolute start-0 top-full z-30 mt-2 max-h-72 min-w-[220px] overflow-y-auto border border-prime-line bg-white p-1.5 shadow-premium',
            panelClassName
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ active, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col rounded-lg px-3 py-2.5 text-start transition',
        active ? 'bg-prime-ink text-prime-sand' : 'text-prime-ink hover:bg-prime-mist'
      )}
    >
      <span className="text-sm font-medium">{title}</span>
      {subtitle ? (
        <span className={cn('text-[11px]', active ? 'text-white/60' : 'text-prime-muted')}>
          {subtitle}
        </span>
      ) : null}
    </button>
  );
}

/** Horizontal filter bar for the stays page */
export default function StaysFiltersBar({
  filters,
  compounds,
  propertyTypes,
  regions,
  onChange,
  onClear,
}) {
  const { localeTag } = useLocale();
  const rootRef = useRef(null);
  const [openMenu, setOpenMenu] = useState(null);

  const compoundsForRegion = useMemo(() => {
    if (!filters.region) return compounds;
    return compounds.filter((c) => c.region === filters.region);
  }, [compounds, filters.region]);

  const compoundLabel =
    compounds.find((c) => c.id === filters.compound)?.name || 'Any compound';
  const typeLabel = filters.propertyType || 'All types';
  const bedsLabel = !filters.beds
    ? 'Any'
    : Number(filters.beds) >= 5
      ? '5+'
      : `${filters.beds}+`;
  const guestsLabel = filters.guests ? `${filters.guests}+` : 'Any';
  const datesLabel =
    filters.checkIn || filters.checkOut
      ? `${formatStayDate(filters.checkIn, 'Arrive', localeTag)} – ${formatStayDate(filters.checkOut, 'Depart', localeTag)}`
      : 'Add dates';

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.compound) n += 1;
    if (filters.region) n += 1;
    if (filters.propertyType) n += 1;
    if (filters.guests) n += 1;
    if (filters.beds) n += 1;
    if (filters.checkIn || filters.checkOut) n += 1;
    return n;
  }, [filters]);

  useEffect(() => {
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function toggle(menu) {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  }

  return (
    <div ref={rootRef} className="relative z-20">
      <div className="overflow-visible border border-prime-line bg-white/90 shadow-[0_20px_50px_rgba(28,28,28,0.06)] backdrop-blur-sm">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-prime-gold/80 to-transparent" />

        <div className="grid divide-y divide-prime-line md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-[1fr_1.1fr_1.25fr_0.95fr_0.7fr_0.75fr_auto]">
          <Dropdown
            label="Destination"
            icon={MapPin}
            valueLabel={filters.region || 'All destinations'}
            open={openMenu === 'region'}
            onToggle={() => toggle('region')}
          >
            <MenuItem
              active={!filters.region}
              title="All destinations"
              onClick={() => {
                onChange({ region: '', compound: '', city: '' });
                setOpenMenu(null);
              }}
            />
            {regions.map((r) => (
              <MenuItem
                key={r}
                active={filters.region === r}
                title={r}
                onClick={() => {
                  const keep =
                    compounds.find((c) => c.id === filters.compound)?.region === r
                      ? filters.compound
                      : '';
                  onChange({ region: r, compound: keep, city: '' });
                  setOpenMenu(null);
                }}
              />
            ))}
          </Dropdown>

          <Dropdown
            label="Compound"
            icon={Building2}
            valueLabel={compoundLabel}
            open={openMenu === 'compound'}
            onToggle={() => toggle('compound')}
            panelClassName="min-w-[260px]"
          >
            <MenuItem
              active={!filters.compound}
              title="Any compound"
              onClick={() => {
                onChange({ compound: '' });
                setOpenMenu(null);
              }}
            />
            {compoundsForRegion.map((c) => (
              <MenuItem
                key={c.id}
                active={filters.compound === c.id}
                title={c.name}
                subtitle={`${c.region} · ${c.unitCount} stays`}
                onClick={() => {
                  onChange({ compound: c.id, region: c.region });
                  setOpenMenu(null);
                }}
              />
            ))}
          </Dropdown>

          <div className="min-w-0 px-3 py-2.5 sm:px-4">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              Dates
            </p>
            <DateRangePicker
              checkin={filters.checkIn || ''}
              checkout={filters.checkOut || ''}
              onChange={({ checkin, checkout }) =>
                onChange({ checkIn: checkin || '', checkOut: checkout || '' })
              }
              onOpenChange={(open) => {
                if (open) setOpenMenu(null);
              }}
            />
          </div>

          <Dropdown
            label="Type"
            icon={Building2}
            valueLabel={typeLabel}
            open={openMenu === 'type'}
            onToggle={() => toggle('type')}
          >
            <MenuItem
              active={!filters.propertyType}
              title="All types"
              onClick={() => {
                onChange({ propertyType: '' });
                setOpenMenu(null);
              }}
            />
            {propertyTypes.map((type) => (
              <MenuItem
                key={type}
                active={filters.propertyType === type}
                title={type}
                onClick={() => {
                  onChange({ propertyType: type });
                  setOpenMenu(null);
                }}
              />
            ))}
          </Dropdown>

          <Dropdown
            label="Beds"
            icon={BedDouble}
            valueLabel={bedsLabel}
            open={openMenu === 'beds'}
            onToggle={() => toggle('beds')}
            panelClassName="min-w-[160px]"
          >
            {BED_OPTIONS.map((n) => (
              <MenuItem
                key={n}
                active={String(filters.beds || '0') === String(n)}
                title={n === 0 ? 'Any' : n === 5 ? '5+' : `${n}+`}
                onClick={() => {
                  onChange({ beds: n === 0 ? '' : String(n) });
                  setOpenMenu(null);
                }}
              />
            ))}
          </Dropdown>

          <Dropdown
            label="Guests"
            icon={Users}
            valueLabel={guestsLabel}
            open={openMenu === 'guests'}
            onToggle={() => toggle('guests')}
            panelClassName="min-w-[200px] p-3"
          >
            <div className="flex items-center justify-between gap-3 px-1 py-1">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    guests: String(Math.max(0, Number(filters.guests || 0) - 1) || ''),
                  })
                }
                className="flex h-10 w-10 items-center justify-center border border-prime-line text-lg transition hover:border-prime-gold"
              >
                −
              </button>
              <span className="font-display text-2xl text-prime-ink">
                {filters.guests || 'Any'}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    guests: String(Math.min(12, Number(filters.guests || 0) + 1)),
                  })
                }
                className="flex h-10 w-10 items-center justify-center border border-prime-line text-lg transition hover:border-prime-gold"
              >
                +
              </button>
            </div>
          </Dropdown>

          <div className="flex items-center justify-end gap-2 px-3 py-3 sm:px-4">
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-prime-muted transition hover:text-prime-ink"
              >
                Clear
              </button>
            ) : null}
            <span className="hidden text-xs text-prime-muted xl:inline">
              {datesLabel !== 'Add dates' ? datesLabel : null}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mobile full sheet — kept for small screens */
export function StaysFiltersSheet({
  filters,
  compounds,
  propertyTypes,
  regions,
  onChange,
  onClear,
  onClose,
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-prime-line px-5 py-4">
        <p className="font-display text-2xl text-prime-ink">Filters</p>
        <button
          type="button"
          onClick={onClose}
          className="border border-prime-line p-2"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <StaysFiltersBar
          filters={filters}
          compounds={compounds}
          propertyTypes={propertyTypes}
          regions={regions}
          onChange={onChange}
          onClear={onClear}
        />
      </div>
      <div className="border-t border-prime-line p-4">
        <button type="button" onClick={onClose} className="prime-btn w-full">
          Show stays
        </button>
      </div>
    </div>
  );
}

export function ActiveFilterPills({ filters, compounds, onRemove, onClear }) {
  const pills = [];
  if (filters.region) pills.push({ key: 'region', label: filters.region });
  if (filters.city) pills.push({ key: 'city', label: filters.city });
  if (filters.compound) {
    const name = compounds.find((c) => c.id === filters.compound)?.name || filters.compound;
    pills.push({ key: 'compound', label: name });
  }
  if (filters.propertyType) pills.push({ key: 'propertyType', label: filters.propertyType });
  if (filters.beds) pills.push({ key: 'beds', label: `${filters.beds}+ beds` });
  if (filters.guests) pills.push({ key: 'guests', label: `${filters.guests}+ guests` });
  if (filters.checkIn || filters.checkOut) {
    pills.push({
      key: 'dates',
      label: [filters.checkIn, filters.checkOut].filter(Boolean).join(' → ') || 'Dates',
    });
  }

  if (!pills.length) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onRemove(p.key)}
          className="inline-flex items-center gap-1.5 border border-prime-line bg-white px-3 py-1.5 text-xs text-prime-ink transition hover:border-prime-gold"
        >
          {p.label}
          <X size={12} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-semibold uppercase tracking-[0.14em] text-prime-muted hover:text-prime-ink"
      >
        Clear all
      </button>
    </div>
  );
}

export function MobileFilterButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 border border-prime-line bg-white px-4 py-2.5 text-sm font-medium text-prime-ink md:hidden"
    >
      <SlidersHorizontal size={15} />
      Filters
      {count > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center bg-prime-gold px-1.5 text-[11px] font-semibold text-prime-ink">
          {count}
        </span>
      ) : null}
    </button>
  );
}
