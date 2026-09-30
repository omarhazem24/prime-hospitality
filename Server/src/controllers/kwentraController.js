const { randomUUID } = require('crypto');
const kwentra = require('../services/kwentraService');
const sync = require('../services/kwentraSync');
const payment = require('../services/paymentService');
const {
  findUnit,
  createBooking,
  updateBooking,
  listBookings,
  findBooking,
  nextVoucherSerial,
} = require('../lib/cmsStore');
const pms = require('../lib/pms');
const { resolveWindow, buildAvailability, buildPricing } = require('../lib/mockCalendar');

function pmsRoomTypeId(listing, explicit) {
  return (
    explicit ||
    listing?.kwentraRoomTypeId ||
    listing?.pmsRoomTypeId ||
    listing?.kwentraUnitId ||
    listing?.pmsUnitId ||
    null
  );
}

function pmsProfileId(listing, explicit) {
  return explicit || listing?.kwentraProfileId || null;
}

/** PULL units: Kwentra details + CMS Drive photos */
async function getUnits(req, res, next) {
  try {
    const publishedOnly = req.query.published !== 'false';
    const merged = await sync.pullUnitsMerged({ publishedOnly });
    res.json({
      source: merged.source,
      items: merged.items,
      total: merged.total,
      pullError: merged.pullError || null,
      needFromKwentra: merged.needFromKwentra || null,
    });
  } catch (err) {
    next(err);
  }
}

/** PULL availability: blocked nights from Kwentra reservations */
async function getAvailability(req, res, next) {
  try {
    const unitKey = req.query.unitId || req.query.slug || req.params.unitId;
    if (!unitKey) return res.status(400).json({ error: 'unitId or slug is required' });

    const listing = await findUnit(unitKey);
    const { from, to } = resolveWindow(req.query);

    if (!listing || listing.published === false) {
      // Still allow availability by room type id alone
      if (kwentra.isConfigured() && req.query.roomTypeId) {
        const avail = await kwentra.getAvailability(req.query.roomTypeId, { from, to });
        return res.json({
          source: 'kwentra',
          roomTypeId: req.query.roomTypeId,
          from,
          to,
          blocked: avail.blocked,
          checkout_dates: avail.checkoutDates,
          prices: avail.prices,
          currency: avail.currency || 'EGP',
        });
      }
      return res.status(404).json({ error: 'Listing not found' });
    }

    try {
      const avail = await sync.pullAvailability(listing, { from, to });
      return res.json({
        source: avail.source,
        id: listing.id,
        slug: listing.slug,
        roomTypeId: avail.roomTypeId || pmsRoomTypeId(listing),
        from,
        to,
        blocked: avail.blocked,
        checkout_dates: avail.checkoutDates || avail.checkout_dates || [],
        prices: avail.prices || {},
        currency: avail.currency || listing.currency || 'EGP',
      });
    } catch (err) {
      console.warn('[kwentra] availability fallback to mock:', err.message);
      const { blocked, checkout_dates } = buildAvailability(listing, from, to);
      const { prices, currency } = buildPricing(listing, from, to);
      res.json({
        source: 'mock',
        id: listing.id,
        slug: listing.slug,
        from,
        to,
        blocked,
        checkout_dates,
        prices,
        currency,
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Nightly prices + occupied nights for [arrival, departure) — Kwentra when connected, mock otherwise.
 */
async function resolveStay(listing, arrivalDate, departureDate) {
  let avail = null;
  try {
    avail = await sync.pullAvailability(listing, { from: arrivalDate, to: departureDate });
  } catch (err) {
    console.warn('[booking] availability lookup failed, using mock calendar:', err.message);
  }
  if (!avail) {
    const { blocked, checkout_dates } = buildAvailability(listing, arrivalDate, departureDate);
    const { prices, currency } = buildPricing(listing, arrivalDate, departureDate);
    avail = { source: 'mock', blocked, checkoutDates: checkout_dates, prices, currency };
  }
  const turnover = new Set(avail.checkoutDates || avail.checkout_dates || []);
  const occupied = (avail.blocked || [])
    .map((b) => (typeof b === 'string' ? b : b?.date))
    .filter((d) => d && d >= arrivalDate && d < departureDate && !turnover.has(d));
  let prices = avail.prices || {};
  if (!Object.keys(prices).length) prices = buildPricing(listing, arrivalDate, departureDate).prices;
  return {
    source: avail.source,
    occupied,
    prices,
    currency: avail.currency || listing.currency || 'EGP',
  };
}

/** POST /api/kwentra/quote — price a stay for every rate plan */
async function getQuote(req, res, next) {
  try {
    const { slug, unitId } = req.body || {};
    const arrivalDate = req.body?.arrivalDate || req.body?.checkIn;
    const departureDate = req.body?.departureDate || req.body?.checkOut;
    const listing = await findUnit(slug || unitId);
    if (!listing || listing.published === false) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const nights = pms.nightsBetween(arrivalDate, departureDate);
    if (nights < 1) {
      return res.status(400).json({ error: 'arrivalDate and departureDate are required' });
    }
    const stay = await resolveStay(listing, arrivalDate, departureDate);
    const ratePlans = pms.ratePlansForStay(nights).map((plan) => {
      const q = pms.priceStay({
        arrivalDate,
        departureDate,
        nightlyPrices: stay.prices,
        fallbackNightly: listing.pricePerNight,
        ratePlan: plan,
        currency: stay.currency,
      });
      return { ...plan, rateAmount: q.rateAmount, averageNightlyRate: q.averageNightlyRate, discount: q.discount };
    });
    res.json({
      source: stay.source,
      slug: listing.slug,
      arrivalDate,
      departureDate,
      nights,
      currency: stay.currency,
      available: stay.occupied.length === 0,
      ratePlans,
    });
  } catch (err) {
    next(err);
  }
}

function publicBooking(b) {
  return {
    id: b.id,
    voucherNumber: b.voucherNumber,
    status: b.status,
    paymentStatus: b.paymentStatus,
    slug: b.slug,
    listingTitle: b.listingTitle,
    destination: b.destination,
    property: b.property,
    roomType: b.roomType,
    primaryGuestName: b.primaryGuestName,
    name: b.primaryGuestName,
    arrivalDate: b.arrivalDate,
    departureDate: b.departureDate,
    nights: b.nights,
    adults: b.adults,
    children: b.children,
    ratePlanName: b.ratePlanName,
    rateAmount: b.rateAmount,
    amount: b.rateAmount,
    rateCurrency: b.rateCurrency,
    currency: b.rateCurrency,
  };
}

/**
 * POST /api/book-direct
 * Website booking engine → validates every PMS data field, holds in Kwentra (when configured),
 * stores the booking and opens an embedded payment session. Guest never leaves our React app.
 */
async function bookDirect(req, res, next) {
  try {
    const { slug, unitId } = req.body || {};
    if (!slug && !unitId) return res.status(400).json({ error: 'slug or unitId is required' });

    const listing = await findUnit(slug || unitId);
    if (!listing || listing.published === false) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const { errors, value } = pms.validateBookingRequest(req.body, listing);
    if (Object.keys(errors).length) {
      return res.status(422).json({ error: 'Please check the highlighted booking details', fields: errors });
    }

    const stay = await resolveStay(listing, value.arrivalDate, value.departureDate);
    if (stay.occupied.length) {
      return res.status(409).json({
        error: 'Some of those nights were just booked — please choose other dates',
        fields: { arrivalDate: 'Dates unavailable' },
        occupied: stay.occupied,
      });
    }

    const quote = pms.priceStay({
      arrivalDate: value.arrivalDate,
      departureDate: value.departureDate,
      nightlyPrices: stay.prices,
      fallbackNightly: listing.pricePerNight,
      ratePlan: value.ratePlan,
      currency: stay.currency,
    });

    const voucherNumber = pms.formatVoucher(await nextVoucherSerial());
    const externalRef = `prime_${randomUUID()}`;

    const booking = {
      id: randomUUID(),
      voucherNumber,
      channel: pms.CHANNEL,
      status: 'pending_payment',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      slug: listing.slug,
      listingId: listing.id,
      listingTitle: listing.title,
      destinationId: listing.destinationId || '',
      destination: listing.destination || listing.region || '',
      propertyId: listing.compoundId || '',
      property: listing.compound || '',
      brand: listing.brand || '',
      roomType: listing.unitType || listing.title,
      kwentraRoomTypeId: pmsRoomTypeId(listing) || '',
      primaryGuestName: value.primaryGuestName,
      otherGuestNames: value.otherGuestNames,
      nationality: value.nationality,
      reservationCountry: value.reservationCountry,
      email: value.email,
      phone: value.phone,
      arrivalDate: value.arrivalDate,
      departureDate: value.departureDate,
      nights: quote.nights,
      checkInTime: value.checkInTime,
      checkOutTime: value.checkOutTime,
      adults: value.adults,
      children: value.children,
      ratePlanCode: value.ratePlan.code,
      ratePlanName: value.ratePlan.name,
      rateAmount: quote.rateAmount,
      averageNightlyRate: quote.averageNightlyRate,
      rateCurrency: quote.currency,
      notes: value.notes || null,
      pricePerNight: listing.pricePerNight,
      externalRef,
      kwentraReservationId: null,
      kwentraProfileId: null,
      // legacy aliases read by payments/webhooks
      name: value.primaryGuestName,
      checkIn: value.arrivalDate,
      checkOut: value.departureDate,
      guests: value.adults + value.children,
      amount: quote.rateAmount,
      currency: quote.currency,
    };

    let kwentraGuest = null;
    let kwentraReservationPush = null;

    if (kwentra.isConfigured()) {
      try {
        kwentraGuest = await kwentra.sendGuestFromWebsite({
          profileId: req.body?.profileId || null,
          name: booking.primaryGuestName,
          email: booking.email,
          phone: booking.phone,
          notes: [`Voucher: ${voucherNumber}`, `Unit: ${listing.title}`, booking.notes || '']
            .filter(Boolean)
            .join(' | '),
          nationality: booking.nationality || booking.reservationCountry,
          address: '',
          city: listing.city || '',
        });
      } catch (err) {
        console.warn('[kwentra] guest profile push failed:', err.message);
        kwentraGuest = { action: 'failed', error: err.message };
      }

      booking.kwentraProfileId = kwentraGuest?.profile?.id || pmsProfileId(listing, req.body?.profileId) || null;

      kwentraReservationPush = await sync.pushReservation(
        sync.buildReservationPayload({
          booking,
          listing: { ...listing, kwentraRoomTypeId: pmsRoomTypeId(listing) },
          guestProfileId: booking.kwentraProfileId,
        })
      );
      if (kwentraReservationPush.pushed) {
        booking.kwentraReservationId = kwentraReservationPush.reservationId || null;
      } else {
        console.warn(
          '[kwentra] reservation push failed:',
          kwentraReservationPush.error || kwentraReservationPush.needFromKwentra
        );
      }
    }

    const saved = await createBooking(booking);

    const paymentSession = await payment.createPaymentSession({
      amount: booking.rateAmount,
      currency: booking.rateCurrency,
      merchantOrderId: externalRef,
      billing: { name: booking.primaryGuestName, email: booking.email, phone: booking.phone },
    });

    res.status(201).json({
      booking: publicBooking({ ...booking, ...saved }),
      pms: pms.toPmsRows(booking),
      payment: paymentSession,
      kwentra: {
        guest: kwentraGuest
          ? {
              action: kwentraGuest.action,
              profileId: kwentraGuest.profile?.id || null,
              error: kwentraGuest.error || null,
            }
          : null,
        reservation: kwentraReservationPush
          ? {
              pushed: Boolean(kwentraReservationPush.pushed),
              reservationId: kwentraReservationPush.reservationId || null,
              needFromKwentra: kwentraReservationPush.needFromKwentra || null,
              error: kwentraReservationPush.error || null,
            }
          : null,
      },
      experience: {
        zeroRedirect: true,
        paymentMode: paymentSession.mode,
        nextStep: 'embed_payment_modal',
      },
    });
  } catch (err) {
    next(err);
  }
}

/** Confirm mock payment without leaving the site (dev / PAYMENT_PROVIDER=mock) */
async function confirmMockPayment(req, res, next) {
  try {
    const { merchantOrderId, bookingId } = req.body || {};
    if (!merchantOrderId && !bookingId) {
      return res.status(400).json({ error: 'merchantOrderId or bookingId required' });
    }

    let booking = bookingId ? await findBooking(bookingId) : null;
    if (!booking && merchantOrderId) {
      const all = await listBookings();
      booking = all.find((b) => b.externalRef === merchantOrderId) || null;
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking = (await updateBooking(booking.id, { status: 'confirmed', paymentStatus: 'paid' })) || booking;

    let paymentPush = null;
    if (booking.kwentraReservationId && kwentra.isConfigured()) {
      paymentPush = await sync.pushPayment({
        reservationId: booking.kwentraReservationId,
        amount: booking.rateAmount ?? booking.amount,
        currency: booking.rateCurrency || booking.currency || 'EGP',
        merchantOrderId: booking.externalRef,
        provider: 'mock',
        transactionId: `mock_${booking.externalRef}`,
      });
    }

    res.json({
      ok: true,
      booking: publicBooking(booking),
      kwentraPayment: paymentPush,
      message: 'Payment confirmed on-site. Money pushed to Kwentra when payment API is available.',
    });
  } catch (err) {
    next(err);
  }
}

async function listReservationsHandler(req, res, next) {
  try {
    if (!kwentra.isConfigured()) {
      return res.status(503).json({ error: 'Kwentra is not configured' });
    }
    const data = await kwentra.listReservations({
      arrivalGte: req.query.arrivalGte || req.query.from,
      arrivalLte: req.query.arrivalLte || req.query.to,
      stateRegex: req.query.stateRegex,
    });
    res.json({
      source: 'kwentra',
      count: data.count,
      items: data.reservations,
      next: data.next,
      previous: data.previous,
    });
  } catch (err) {
    next(err);
  }
}

async function getGuestProfileHandler(req, res, next) {
  try {
    if (!kwentra.isConfigured()) {
      return res.status(503).json({ error: 'Kwentra is not configured' });
    }
    const profile = await kwentra.getGuestProfile(req.params.profileId);
    res.json({ source: 'kwentra', profile });
  } catch (err) {
    next(err);
  }
}

async function updateGuestProfileHandler(req, res, next) {
  try {
    if (!kwentra.isConfigured()) {
      return res.status(503).json({ error: 'Kwentra is not configured' });
    }
    const profile = await kwentra.patchGuestProfile(req.params.profileId, req.body || {});
    res.json({ source: 'kwentra', profile });
  } catch (err) {
    next(err);
  }
}

async function sendGuestHandler(req, res, next) {
  try {
    if (!kwentra.isConfigured()) {
      return res.status(503).json({ error: 'Kwentra is not configured' });
    }
    const result = await kwentra.sendGuestFromWebsite(req.body || {});
    res.status(result.action === 'created' ? 201 : 200).json({
      source: 'kwentra',
      action: result.action,
      profile: result.profile,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUnits,
  getAvailability,
  getQuote,
  bookDirect,
  confirmMockPayment,
  listReservationsHandler,
  getGuestProfileHandler,
  updateGuestProfileHandler,
  sendGuestHandler,
};
