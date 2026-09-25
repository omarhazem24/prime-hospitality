import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { kwentraApi } from '../../services/api';
import { formatMoney } from '../../theme/brand';

/**
 * Embedded payment panel — Paymob iframe / Stripe Elements / mock.
 * STRICT: never window.location.assign to an external checkout.
 */
export default function PaymentModal({
  open,
  onClose,
  payment,
  booking,
  amount,
  currency = 'EGP',
  onPaid,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !payment?.merchantOrderId || payment.provider === 'mock') return undefined;
    setPolling(true);
    const id = setInterval(async () => {
      try {
        const status = await kwentraApi.paymentStatus(payment.merchantOrderId);
        if (status.paymentStatus === 'paid') {
          clearInterval(id);
          setPolling(false);
          onPaid?.({ bookingId: status.bookingId || booking?.id, merchantOrderId: payment.merchantOrderId });
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => {
      clearInterval(id);
      setPolling(false);
    };
  }, [open, payment, booking, onPaid]);

  if (!open || !payment) return null;

  async function payMock() {
    setBusy(true);
    setError('');
    try {
      const res = await kwentraApi.confirmMockPayment({
        merchantOrderId: payment.merchantOrderId,
        bookingId: booking?.id,
      });
      onPaid?.({ bookingId: res.booking?.id || booking?.id, merchantOrderId: payment.merchantOrderId });
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-prime-ink/50" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden border border-prime-line bg-white shadow-2xl sm:max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-prime-line px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
              Secure on-site payment
            </p>
            <p className="mt-1 font-display text-xl font-bold text-prime-ink">
              {formatMoney(amount, currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center border border-prime-line"
            aria-label="Close payment"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {payment.mode === 'embedded_iframe' && payment.iframeSrc ? (
            <iframe
              title="Card payment"
              src={payment.iframeSrc}
              className="h-[520px] w-full border-0"
              allow="payment *"
            />
          ) : null}

          {payment.mode === 'embedded_elements' ? (
            <div className="space-y-3 py-6 text-sm text-prime-muted">
              <p>Stripe PaymentIntent ready (client secret issued).</p>
              <p className="text-xs">
                Mount Stripe Elements with <code>clientSecret</code> here when Stripe.js is added —
                guests confirm cards without leaving this modal.
              </p>
              <p className="break-all text-[10px] text-prime-muted/80">{payment.clientSecret}</p>
            </div>
          ) : null}

          {payment.mode === 'embedded_mock' || payment.provider === 'mock' ? (
            <div className="space-y-4 py-8 text-center">
              <p className="text-sm text-prime-muted">
                Mock gateway — confirm payment without leaving Prime.
              </p>
              <button type="button" className="prime-btn" disabled={busy} onClick={payMock}>
                {busy ? 'Confirming…' : 'Pay now (mock)'}
              </button>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {polling ? (
            <p className="mt-3 text-center text-xs text-prime-muted">Waiting for payment confirmation…</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
