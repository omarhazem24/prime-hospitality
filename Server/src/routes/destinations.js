const { Router } = require('express');
const { isConfigured } = require('../services/kwentraService');
const sync = require('../services/kwentraSync');
const { getPublicCompounds } = require('../lib/cmsStore');

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Destinations with nested projects (from Kwentra + CMS image overlays).
 * GET /api/destinations
 * GET /api/destinations/:id
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const homeOnly = req.query.home === true || req.query.home === 'true';
    const tree = await sync.pullDestinationsTree({ homeOnly });
    res.json({
      source: tree.source,
      items: tree.destinations,
      projects: tree.projects,
      total: tree.destinations.length,
      needFromKwentra: tree.needFromKwentra,
      errors: tree.errors?.length ? tree.errors : undefined,
    });
  })
);

router.get(
  '/:id',
  wrap(async (req, res) => {
    const tree = await sync.pullDestinationsTree({ homeOnly: false });
    const item = (tree.destinations || []).find(
      (d) => d.id === req.params.id || d.kwentraDestinationId === req.params.id
    );
    if (!item) return res.status(404).json({ error: 'Destination not found' });
    res.json({ source: tree.source, item });
  })
);

module.exports = router;
