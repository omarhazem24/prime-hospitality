const { Router } = require('express');
const { bookingConfig } = require('../lib/pms');
const { detectCountry } = require('../lib/geo');

const router = Router();

/** GET /api/booking/config — PMS field contract, rate plans, arrival/departure time slots */
router.get('/config', (_req, res) => {
  res.json(bookingConfig());
});

/** GET /api/booking/geo — booker country from IP (auto-fills nationality + reservation country) */
router.get('/geo', async (req, res, next) => {
  try {
    res.json(await detectCountry(req));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
