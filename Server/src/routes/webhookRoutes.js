const { Router } = require('express');
const payment = require('../services/paymentService');
const kwentra = require('../services/kwentraService');
const sync = require('../services/kwentraSync');
const { listBookings, updateBooking } = require('../lib/cmsStore');

const router = Router();

async function markPaidAndPush(booking, { provider, transactionId, merchantOrderId }) {
  if (!booking) return null;
  await updateBooking(booking.id, { status: 'confirmed', paymentStatus: 'paid' });
  if (booking.kwentraReservationId && kwentra.isConfigured()) {
    return sync.pushPayment({
      reservationId: booking.kwentraReservationId,
      amount: booking.rateAmount ?? booking.amount,
      currency: booking.rateCurrency || booking.currency || 'EGP',
      merchantOrderId: merchantOrderId || booking.externalRef,
      provider,
      transactionId,
    });
  }
  return { pushed: false, reason: 'no_kwentra_reservation' };
}

router.post('/paymob', async (req, res, next) => {
  try {
    const obj = req.body?.obj || req.body || {};
    const hmac = req.query.hmac || req.body?.hmac || req.headers['x-paymob-hmac'];
    if (process.env.PAYMOB_HMAC_SECRET && !payment.verifyPaymobHmac(obj, hmac)) {
      return res.status(401).json({ error: 'Invalid Paymob HMAC' });
    }

    const success = obj.success === true || obj.success === 'true';
    const merchantOrderId = obj.order?.merchant_order_id || obj.merchant_order_id;
    if (!success || !merchantOrderId) {
      return res.json({ received: true, handled: false });
    }

    const all = await listBookings();
    const booking = all.find((b) => b.externalRef === merchantOrderId);
    const kwentraPayment = await markPaidAndPush(booking, {
      provider: 'paymob',
      transactionId: obj.id,
      merchantOrderId,
    });

    res.json({ received: true, handled: true, merchantOrderId, kwentraPayment });
  } catch (err) {
    next(err);
  }
});

router.post('/stripe', async (req, res, next) => {
  try {
    const event = req.body;
    if (event?.type === 'payment_intent.succeeded') {
      const merchantOrderId = event.data?.object?.metadata?.merchant_order_id;
      if (merchantOrderId) {
        const all = await listBookings();
        const booking = all.find((b) => b.externalRef === merchantOrderId);
        await markPaidAndPush(booking, {
          provider: 'stripe',
          transactionId: event.data?.object?.id,
          merchantOrderId,
        });
      }
    }
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

router.post('/kwentra', async (req, res) => {
  console.log('[webhook/kwentra]', JSON.stringify(req.body)?.slice(0, 500));
  res.json({ received: true });
});

module.exports = router;
