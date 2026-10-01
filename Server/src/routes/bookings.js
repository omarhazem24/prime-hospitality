const { Router } = require('express');
const { randomUUID } = require('crypto');
const { findUnit, createBooking, listBookings, findBooking } = require('../lib/cmsStore');
const { requireAdmin } = require('../middleware/adminAuth');

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  '/',
  requireAdmin,
  wrap(async (_req, res) => {
    res.json({ items: await listBookings() });
  })
);

router.post(
  '/',
  wrap(async (req, res) => {
    const { slug, name, email, phone, guests, checkIn, checkOut, notes } = req.body || {};
    if (!slug || !name || !email) {
      return res.status(400).json({ error: 'slug, name, and email are required' });
    }

    const listing = await findUnit(slug);
    if (!listing?.live) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const booking = await createBooking({
      id: randomUUID(),
      status: 'requested',
      createdAt: new Date().toISOString(),
      slug,
      listingId: listing.id,
      listingTitle: listing.title,
      name,
      email,
      phone: phone || null,
      guests: guests ? Number(guests) : null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      notes: notes || null,
      pricePerNight: listing.pricePerNight,
      currency: listing.currency,
    });

    res.status(201).json({ booking });
  })
);

router.get(
  '/:id',
  wrap(async (req, res) => {
    const booking = await findBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking });
  })
);

module.exports = router;
