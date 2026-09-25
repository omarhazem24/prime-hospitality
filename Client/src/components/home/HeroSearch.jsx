import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, Search, Users } from 'lucide-react';
import DateRangePicker from '../ui/DateRangePicker';
import { useLocale } from '../../context/LocaleContext';
import api from '../../api/client';
import { cn } from '../../utils/cn';

const isAfterDay = (a, b) => {
  const sa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const sb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return sa > sb;
};

function placeMenu(anchorEl, { align = 'start', minWidth = 240, maxWidth = 360 } = {}) {
  if (!anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  const width = Math.min(maxWidth, Math.max(rect.width, minWidth));
  let left = align === 'end' ? rect.right - width : rect.left;
  if (left + width > window.innerWidth - 12) {
    left = Math.max(12, window.innerWidth - width - 12);
  }
  left = Math.max(12, left);
  return {
    position: 'fixed',
    top: rect.bottom + 8,
    left,
    width,
    zIndex: 400,
  };
}

export default function HeroSearch({ compact = false }) {
  const navigate = useNavigate();
  const { t } = useLocale();
  const projectBtnRef = useRef(null);
  const guestBtnRef = useRef(null);
  const projectMenuRef = useRef(null);
  const guestMenuRef = useRef(null);
  const [compounds, setCompounds] = useState([]);

  const [criteria, setCriteria] = useState({
    project: '',
    compoundId: '',
    checkin: '',
    checkout: '',
    guests: 1,
  });
  const [projectOpen, setProjectOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [projectStyle, setProjectStyle] = useState(null);
  const [guestStyle, setGuestStyle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getCompounds()
      .then((res) => {
        if (!cancelled) setCompounds(res.items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!projectOpen) {
      setProjectStyle(null);
      return undefined;
    }
    const update = () => setProjectStyle(placeMenu(projectBtnRef.current, { minWidth: 260, maxWidth: 380 }));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [projectOpen]);

  useLayoutEffect(() => {
    if (!guestOpen) {
      setGuestStyle(null);
      return undefined;
    }
    const update = () => setGuestStyle(placeMenu(guestBtnRef.current, { align: 'end', minWidth: 240, maxWidth: 280 }));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [guestOpen]);

  useEffect(() => {
    if (!projectOpen && !guestOpen) return undefined;
    const onOutside = (event) => {
      const t = event.target;
      const inProject =
        projectBtnRef.current?.contains(t) || projectMenuRef.current?.contains(t);
      const inGuest = guestBtnRef.current?.contains(t) || guestMenuRef.current?.contains(t);
      if (!inProject) setProjectOpen(false);
      if (!inGuest) setGuestOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setProjectOpen(false);
        setGuestOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [projectOpen, guestOpen]);

  const projects = useMemo(() => compounds, [compounds]);
  const projectLabel = criteria.project || t('home.whichProject');

  const hasValidRange =
    criteria.checkin &&
    criteria.checkout &&
    isAfterDay(
      new Date(`${criteria.checkout}T00:00:00`),
      new Date(`${criteria.checkin}T00:00:00`)
    );

  function handleSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (criteria.compoundId) params.set('compound', criteria.compoundId);
    if (criteria.checkin) params.set('checkIn', criteria.checkin);
    if (criteria.checkout) params.set('checkOut', criteria.checkout);
    if (criteria.guests > 0) params.set('guests', String(criteria.guests));
    navigate(`/search?${params.toString()}`);
  }

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-sm border border-prime-line bg-white p-4 shadow-sm md:grid-cols-[1.2fr_1fr_auto]"
      >
        <label className="block text-left">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-prime-muted">
            {t('home.project')}
          </span>
          <select
            className="prime-input"
            value={criteria.compoundId}
            onChange={(e) => {
              const id = e.target.value;
              const found = compounds.find((c) => c.id === id);
              setCriteria((c) => ({
                ...c,
                compoundId: id,
                project: found?.name || '',
              }));
            }}
          >
            <option value="">{t('home.anyProject')}</option>
            {compounds.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.region}
              </option>
            ))}
          </select>
        </label>
        <DateRangePicker
          checkin={criteria.checkin}
          checkout={criteria.checkout}
          onChange={({ checkin, checkout }) =>
            setCriteria((c) => ({ ...c, checkin: checkin || '', checkout: checkout || '' }))
          }
        />
        <button type="submit" className="prime-btn self-end">
          {t('home.searchStays')}
        </button>
      </form>
    );
  }

  const projectMenu =
    projectOpen && projectStyle && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={projectMenuRef}
            style={projectStyle}
            className="max-h-72 overflow-y-auto border border-white/15 bg-prime-night/97 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() => {
                setCriteria((c) => ({ ...c, project: '', compoundId: '' }));
                setProjectOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-start text-sm text-white/80 transition hover:bg-white/10"
            >
              <span>{t('home.anyProject')}</span>
            </button>
            {projects.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setCriteria((c) => ({
                    ...c,
                    project: option.name,
                    compoundId: option.id,
                  }));
                  setProjectOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-3 text-start transition hover:bg-white/10',
                  criteria.compoundId === option.id && 'bg-white/10'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{option.name}</span>
                  {option.region ? (
                    <span className="block truncate text-[11px] text-white/45">{option.region}</span>
                  ) : null}
                </span>
              </button>
            ))}
            {projects.length === 0 ? (
              <p className="px-4 py-3 text-sm text-white/50">{t('home.noProjects')}</p>
            ) : null}
          </div>,
          document.body
        )
      : null;

  const guestMenu =
    guestOpen && guestStyle && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={guestMenuRef}
            style={guestStyle}
            className="border border-white/15 bg-prime-night/97 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCriteria((c) => ({ ...c, guests: Math.max(1, c.guests - 1) }))}
                className="flex h-11 w-11 items-center justify-center border border-white/25 text-xl text-white transition hover:border-prime-gold hover:bg-white/10"
              >
                −
              </button>
              <span className="font-display text-3xl text-white">{criteria.guests}</span>
              <button
                type="button"
                onClick={() => setCriteria((c) => ({ ...c, guests: c.guests + 1 }))}
                className="flex h-11 w-11 items-center justify-center border border-white/25 text-xl text-white transition hover:border-prime-gold hover:bg-white/10"
              >
                +
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="prime-search-dock relative z-[60] w-full border border-white/25 bg-prime-night/70 shadow-[0_32px_80px_rgba(34,31,32,0.45)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-prime-gold/80 to-transparent" />

      <div className="grid lg:grid-cols-[1.2fr_1.35fr_0.9fr_auto]">
        <div className="relative border-b border-white/15 lg:border-b-0 lg:border-e">
          <button
            ref={projectBtnRef}
            type="button"
            aria-expanded={projectOpen}
            aria-haspopup="listbox"
            onClick={() => {
              setProjectOpen((o) => !o);
              setGuestOpen(false);
            }}
            className="group flex w-full items-center gap-3 px-4 py-4 text-start transition hover:bg-white/[0.06] sm:gap-3.5 sm:px-6 sm:py-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-prime-gold/35 bg-white/5 text-prime-gold transition group-hover:border-prime-gold/70">
              <MapPin size={17} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                {t('home.project')}
                <ChevronDown
                  size={13}
                  className={cn('opacity-70 transition', projectOpen && 'rotate-180')}
                />
              </span>
              <span
                className={cn(
                  'mt-1.5 block truncate font-display text-[1.1rem] font-bold leading-none tracking-[-0.02em] sm:text-[1.25rem]',
                  criteria.project ? 'text-white' : 'text-white/45'
                )}
              >
                {projectLabel}
              </span>
            </span>
          </button>
          {projectMenu}
        </div>

        <div className="border-b border-white/15 px-4 py-4 sm:px-5 sm:py-5 lg:border-b-0 lg:border-e">
          <DateRangePicker
            variant="hero"
            checkin={criteria.checkin}
            checkout={criteria.checkout}
            onChange={({ checkin, checkout }) =>
              setCriteria((c) => ({ ...c, checkin: checkin || '', checkout: checkout || '' }))
            }
            onOpenChange={(open) => {
              if (open) {
                setProjectOpen(false);
                setGuestOpen(false);
              }
            }}
          />
        </div>

        <div className="relative border-b border-white/15 lg:border-b-0 lg:border-e">
          <button
            ref={guestBtnRef}
            type="button"
            aria-expanded={guestOpen}
            onClick={() => {
              setGuestOpen((o) => !o);
              setProjectOpen(false);
            }}
            className="group flex w-full items-center gap-3 px-4 py-4 text-start transition hover:bg-white/[0.06] sm:gap-3.5 sm:px-6 sm:py-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-prime-gold/35 bg-white/5 text-prime-gold transition group-hover:border-prime-gold/70">
              <Users size={17} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                {t('home.searchGuests')}
              </span>
              <span className="mt-1.5 block truncate font-display text-[1.25rem] font-bold leading-none tracking-[-0.02em] text-white">
                {t('common.guestsCount', { count: criteria.guests })}
              </span>
            </span>
          </button>
          {guestMenu}
        </div>

        <div className="flex items-stretch p-3 sm:p-4">
          <button
            type="submit"
            disabled={criteria.checkin && criteria.checkout ? !hasValidRange : false}
            className="inline-flex w-full items-center justify-center gap-2 bg-prime-gold px-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-prime-ink shadow-[0_10px_30px_rgba(184,151,106,0.35)] transition hover:bg-prime-gold-soft disabled:cursor-not-allowed disabled:opacity-50 lg:min-w-[168px]"
          >
            <Search size={15} strokeWidth={2.25} />
            {t('home.searchStays')}
          </button>
        </div>
      </div>
    </form>
  );
}
