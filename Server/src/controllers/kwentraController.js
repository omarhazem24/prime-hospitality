const { randomUUID } = require('crypto');
const kwentra = require('../services/kwentraService');
const sync = require('../services/kwentraSync');
const payment = require('../services/paymentService');
const { findUnit, createBooking, listBookings } = require('../lib/cmsStore');
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

async function getQuote(req, res, next) {
  try {
    const { slug, unitId, checkIn, checkOut, guests } = req.body || {};
    const listing = await findUnit(slug || unitId);
    if (!listing || listing.published === false) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: 'checkIn and checkOut are required' });
    }

    if (kwentra.isConfigured()) {
      try {
        const quote = await kwentra.quoteStay({
          unitId: pmsRoomTypeId(listing, unitId),
          checkIn,
          checkOut,
          guests: guests ? Number(guests) : 2,
        });
        return res.json({ source: 'kwentra', quote, listingId: listing.id, slug: listing.slug });
      } catch (err) {
        if (err.code !== 'KWENTRA_QUOTE_NOT_DOCUMENTED') {
          console.warn('[kwentra] quote fallback:', err.message);
        }
      }
    }

    const { from, to } = resolveWindow({ from: checkIn, to: checkOut });
    const { prices, rows, currency } = buildPricing(listing, from, to);
    const nights = rows?.length || 0;
    const total = Object.values(prices || {}).reduce((s, n) => s + Number(n || 0), 0);
    res.json({
      source: 'mock',
      listingId: listing.id,
      slug: listing.slug,
      checkIn,
      checkOut,
      nights,
      total,
      currency: currency || listing.currency || 'EGP',
      prices,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/book-direct
 * On-site instant booking: hold in Kwentra (or local) + embedded payment session.
 * Guest never leaves our React app.
 */
async function bookDirect(req, res, next) {
  try {
    const {
      slug,
      unitId,
      name,
      email,
      phone,
      guests,
      checkIn,
      checkOut,
      notes,
      amount,
      currency = 'EGP',
    } = req.body || {};

    if (!slug && !unitId) return res.status(400).json({ error: 'slug or unitId is required' });
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
    if (!checkIn || !checkOut) return res.status(400).json({ error: 'checkIn and checkOut are required' });

    const listing = await findUnit(slug || unitId);
    if (!listing || listing.published === false) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const externalRef = `prime_${randomUUID()}`;
    let stayAmount = amount != null ? Number(amount) : null;

    if (stayAmount == null) {
      const { from, to } = resolveWindow({ from: checkIn, to: checkOut });
      const { prices } = buildPricing(listing, from, to);
      stayAmount = Object.values(prices || {}).reduce((s, n) => s + Number(n || 0), 0);
      if (!stayAmount) stayAmount = Number(listing.pricePerNight) || 0;
    }

    let kwentraReservation = null;
    let kwentraReservationPush = null;
    let kwentraGuest = null;

    // PUSH guest details + reservation to Kwentra (when configured)
    if (kwentra.isConfigured()) {
      try {
        kwentraGuest = await kwentra.sendGuestFromWebsite({
          profileId: req.body?.profileId || null,
          name,
          email,
          phone,
          notes:
            [
              notes || '',
              checkIn && checkOut ? `Stay: ${checkIn} → ${checkOut}` : '',
              guests ? `Guests: ${guests}` : '',
              listing?.title ? `Unit: ${listing.title}` : '',
              `Ref: ${externalRef}`,
            ]
              .filter(Boolean)
              .join(' | '),
          nationality: req.body?.nationality || 'EG',
          address: req.body?.address || '',
          city: req.body?.city || listing?.city || '',
        });
      } catch (err) {
        console.warn('[kwentra] guest profile push failed:', err.message);
        kwentraGuest = { action: 'failed', error: err.message };
      }

      const profileId =
        kwentraGuest?.profile?.id || pmsProfileId(listing, req.body?.profileId) || null;

      const reservationBody = sync.buildReservationPayload({
        listing: {
          ...listing,
          kwentraRoomTypeId: pmsRoomTypeId(listing, unitId),
        },
        guestProfileId: profileId,
        name,
        email,
        phone,
        guests: guests ? Number(guests) : 2,
        checkIn,
        checkOut,
        notes,
        externalRef,
        amount: stayAmount,
        currency: currency || listing.currency || 'EGP',
        rateId: req.body?.rateId,
        boardTypeId: req.body?.boardTypeId,
      });

      kwentraReservationPush = await sync.pushReservation(reservationBody);
      if (kwentraReservationPush.pushed) {
        kwentraReservation = {
          id: kwentraReservationPush.reservationId,
          ...(kwentraReservationPush.data || {}),
        };
      } else {
        console.warn(
          '[kwentra] reservation push failed:',
          kwentraReservationPush.error || kwentraReservationPush.needFromKwentra
        );
      }
    }

    const booking = await createBooking({
      id: randomUUID(),
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
      slug: listing.slug,
      listingId: listing.id,
      listingTitle: listing.title,
      name,
      email,
      phone: phone || null,
      guests: guests ? Number(guests) : null,
      checkIn,
      checkOut,
      notes: notes || null,
      pricePerNight: listing.pricePerNight,
      currency: currency || listing.currency || 'EGP',
      amount: stayAmount,
      externalRef,
      kwentraReservationId:
        kwentraReservation?.id ||
        kwentraReservation?.reservationId ||
        kwentraReservation?.reservation_id ||
        null,
      kwentraProfileId: kwentraGuest?.profile?.id || null,
      paymentStatus: 'pending',
    });

    const paymentSession = await payment.createPaymentSession({
      amount: stayAmount,
      currency: currency || listing.currency || 'EGP',
      merchantOrderId: externalRef,
      billing: { name, email, phone },
    });

    res.status(201).json({
      booking,
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

    const { findBooking } = require('../lib/cmsStore');
    let booking = bookingId ? await findBooking(bookingId) : null;
    if (!booking && merchantOrderId) {
      const all = await listBookings();
      booking = all.find((b) => b.externalRef === merchantOrderId) || null;
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';

    let paymentPush = null;
    if (booking.kwentraReservationId && kwentra.isConfigured()) {
      paymentPush = await sync.pushPayment({
        reservationId: booking.kwentraReservationId,
        amount: booking.amount,
        currency: booking.currency || 'EGP',
        merchantOrderId: booking.externalRef,
        provider: 'mock',
        transactionId: `mock_${booking.externalRef}`,
      });
    }

    res.json({
      ok: true,
      booking,
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
