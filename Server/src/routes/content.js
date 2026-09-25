const { Router } = require('express');
const { getContent, getSlideshow, getSettings } = require('../lib/cmsStore');

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  '/meta',
  wrap(async (_req, res) => {
    const { propertyTypes } = await getContent();
    res.json({ propertyTypes: propertyTypes || [] });
  })
);

router.get(
  '/partners',
  wrap(async (_req, res) => {
    const { partners } = await getContent();
    res.json({ items: partners || [] });
  })
);

router.get(
  '/trust',
  wrap(async (_req, res) => {
    const { trustPoints } = await getContent();
    res.json({ items: trustPoints || [] });
  })
);

router.get(
  '/faqs',
  wrap(async (_req, res) => {
    const { faqs } = await getContent();
    res.json({ items: faqs || [] });
  })
);

router.get(
  '/slideshow',
  wrap(async (_req, res) => {
    res.json({ items: await getSlideshow() });
  })
);

router.get(
  '/pixels',
  wrap(async (_req, res) => {
    const s = await getSettings();
    res.json({
      metaPixelId: s.metaPixelId || '',
      facebookPixelId: s.facebookPixelId || s.metaPixelId || '',
      googleAdsId: s.googleAdsId || '',
      gtmId: s.gtmId || '',
    });
  })
);

module.exports = router;
