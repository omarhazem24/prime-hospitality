import { useState } from 'react';

/**
 * On-site guest details form — never posts to Kwentra or an external checkout host.
 */
export default function BookingForm({
  initial = {},
  submitting = false,
  error = '',
  submitLabel = 'Continue to payment',
  onSubmit,
}) {
  const [name, setName] = useState(initial.name || '');
  const [email, setEmail] = useState(initial.email || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const [notes, setNotes] = useState(initial.notes || '');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.({ name, email, phone, notes });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
          Full name
        </span>
        <input
          required
          className="prime-input"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
          Email
        </span>
        <input
          required
          type="email"
          className="prime-input"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
          Phone
        </span>
        <input
          required
          type="tel"
          className="prime-input"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
          Notes
        </span>
        <textarea
          className="prime-input min-h-[100px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className="prime-btn w-full" disabled={submitting}>
        {submitting ? 'Preparing secure payment…' : submitLabel}
      </button>
      <p className="text-center text-[11px] text-prime-muted">
        Your details stay on Prime and are sent to our property system (Kwentra). Payment opens in an
        embedded panel — no redirects.
      </p>
    </form>
  );
}
