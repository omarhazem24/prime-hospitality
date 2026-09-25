const { Router } = require('express');
const { getPublicUnits, findUnit } = require('../lib/cmsStore');
const { resolveWindow, buildAvailability, buildPricing } = require('../lib/mockCalendar');

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function matchesFilters(listing, params = {}) {
  const { compound, region, city, propertyType, guests, beds, q, featured } = params;

  if (featured === true || featured === 'true') {
    if (!listing.featured) return false;
  }
  if (compound && listing.compoundId !== compound && listing.compound !== compound) {
    return false;
  }
  if (region && listing.region !== region) return false;
  if (city && listing.city !== city) return false;
  if (propertyType && propertyType !== 'All' && listing.propertyType !== propertyType) {
    return false;
  }
  if (guests && listing.maxGuests < Number(guests)) return false;
  if (beds) {
    const n = Number(beds);
    if (n >= 5) {
      if (listing.bedrooms < 5) return false;
    } else if (listing.bedrooms < n) {
      return false;
    }
  }
  if (q) {
    const hay = `${listing.title} ${listing.compound} ${listing.city} ${listing.region}`.toLowerCase();
    if (!hay.includes(String(q).toLowerCase())) return false;
  }
  return true;
}

router.get(
  '/',
  wrap(async (req, res) => {
    const featuredOnly = req.query.featured === true || req.query.featured === 'true';
    const sync = require('../services/kwentraSync');
    const { isConfigured } = require('../services/kwentraService');

    let items;
    if (isConfigured()) {
      const merged = await sync.pullUnitsMerged({ publishedOnly: true });
      items = merged.items || [];
    } else {
      items = await getPublicUnits({ featuredOnly, publishedOnly: true });
    }

    items = items.filter((l) => matchesFilters(l, req.query));
    if (featuredOnly) items = items.filter((l) => l.featured);

    const total = items.length;
    const limit = req.query.limit ? Number(req.query.limit) : items.length;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    items = items.slice(offset, offset + limit);
    res.json({ items, total });
  })
);

router.get(
  '/:slug/availability',
  wrap(async (req, res) => {
    const item = await findUnit(req.params.slug);
    if (!item || item.published === false) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const { from, to } = resolveWindow(req.query);
    const { blocked, checkout_dates } = buildAvailability(item, from, to);
    res.json({
      id: item.id,
      slug: item.slug,
      from,
      to,
      blocked,
      checkout_dates,
    });
  })
);

router.get(
  '/:slug/pricing',
  wrap(async (req, res) => {
    const item = await findUnit(req.params.slug);
    if (!item || item.published === false) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const { from, to } = resolveWindow(req.query);
    const { prices, rows, currency } = buildPricing(item, from, to);
    res.json({
      id: item.id,
      slug: item.slug,
      from,
      to,
      currency,
      prices,
      rows,
    });
  })
);

router.get(
  '/:slug',
  wrap(async (req, res) => {
    const item = await findUnit(req.params.slug);
    if (!item || item.published === false) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({ item });
  })
);

module.exports = router;
