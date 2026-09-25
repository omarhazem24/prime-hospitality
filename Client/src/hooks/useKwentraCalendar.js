import { useCallback, useEffect, useMemo, useState } from 'react';
import { kwentraApi } from '../services/api';
import { sumStayPrices, isoToLocalDate } from '../components/listing/ListingDatePicker';

/**
 * Syncs blocked nights + daily rates for a unit via our Node gateway (never Kwentra directly).
 */
export default function useKwentraCalendar({ slug, unitId, enabled = true } = {}) {
  const [blockedDates, setBlockedDates] = useState([]);
  const [checkoutDates, setCheckoutDates] = useState([]);
  const [dailyPrices, setDailyPrices] = useState({});
  const [currency, setCurrency] = useState('EGP');
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled || (!slug && !unitId)) return;
    setLoading(true);
    setError('');
    try {
      const data = await kwentraApi.getAvailability({ slug, unitId });
      setBlockedDates(data.blocked || []);
      setCheckoutDates(data.checkout_dates || data.checkoutDates || []);
      setDailyPrices(data.prices || {});
      setCurrency(data.currency || 'EGP');
      setSource(data.source || null);
    } catch (err) {
      setError(err.message || 'Could not load availability');
    } finally {
      setLoading(false);
    }
  }, [slug, unitId, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const range = useMemo(
    () => ({
      start: isoToLocalDate(checkIn),
      end: isoToLocalDate(checkOut),
    }),
    [checkIn, checkOut]
  );

  const quote = useMemo(() => sumStayPrices(range.start, range.end, dailyPrices), [range, dailyPrices]);

  return {
    blockedDates,
    checkoutDates,
    dailyPrices,
    currency,
    source,
    loading,
    error,
    checkIn,
    checkOut,
    setCheckIn,
    setCheckOut,
    range,
    quote,
    refresh,
  };
}
