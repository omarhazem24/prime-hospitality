import ListingDatePicker, {
  formatBookingDate,
  isoToLocalDate,
  localDateToIso,
} from '../listing/ListingDatePicker';
import { cn } from '../../utils/cn';

/**
 * Native interactive calendar — blocked / available nights from our API gateway.
 * No Kwentra widgets or external booking-engine embeds.
 */
export default function UnitCalendar({
  checkIn,
  checkOut,
  onChange,
  blockedDates = [],
  checkoutDates = [],
  dailyPrices = {},
  inline = true,
  months = 2,
  className,
  loading = false,
  error = '',
}) {
  const value = {
    start: isoToLocalDate(checkIn),
    end: isoToLocalDate(checkOut),
  };

  return (
    <div className={cn('relative', className)}>
      {loading ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-prime-muted">
          Syncing availability…
        </p>
      ) : null}
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <ListingDatePicker
        inline={inline}
        months={months}
        value={value}
        blockedDates={blockedDates}
        checkoutDates={checkoutDates}
        dailyPrices={dailyPrices}
        onChange={(next) => {
          onChange?.({
            checkIn: next?.start ? localDateToIso(next.start) : '',
            checkOut: next?.end ? localDateToIso(next.end) : '',
          });
        }}
      />
      {checkIn && checkOut ? (
        <p className="mt-3 text-sm text-prime-muted">
          {formatBookingDate(checkIn)} → {formatBookingDate(checkOut)}
        </p>
      ) : null}
    </div>
  );
}
