import { useState } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import PageHeader from '../components/ui/PageHeader';
import KeyLine from '../components/ui/KeyLine';
import api from '../api/client';

const STEPS = [
  {
    title: 'Present beautifully',
    body: 'Editorial photography and listing design that match the standard of your home.',
  },
  {
    title: 'Host with ease',
    body: 'Guest communication, calendars, and care handled with Prime hospitality standards.',
  },
  {
    title: 'Earn with confidence',
    body: 'Short- and long-term stays positioned for discerning travelers across Egypt.',
  },
];

export default function BecomeAHostPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    details: '',
  });

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.sendPartnerInquiry(form);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not submit inquiry');
    }
  }

  return (
    <div>
      <Header />
      <main>
        <section className="prime-frame relative overflow-hidden bg-prime-night px-5 pb-20 pt-28 text-white sm:px-8 md:pb-24 md:pt-32">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 55% 60% at 85% 30%, rgba(172,148,107,0.22), transparent 55%)',
            }}
          />
          <div className="relative z-10 mx-auto max-w-prime">
            <PageHeader
              tone="dark"
              eyebrow="Partners"
              title="List your property with Prime"
              lede="Premium care for short- and long-term stays — design-led presentation, guest support, and operational excellence."
            />
          </div>
        </section>

        <section className="bg-prime-mist py-16 md:py-20">
          <div className="mx-auto grid max-w-prime gap-0 px-5 sm:px-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="border-t border-prime-line py-8 md:border-t-0 md:border-s md:border-prime-line md:px-8 md:py-2 first:md:border-s-0 first:md:ps-0"
              >
                <span className="font-display text-3xl font-bold text-prime-gold/45">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="mt-4 font-display text-xl font-bold tracking-[-0.02em] text-prime-ink">
                  {s.title}
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-prime-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-prime px-5 py-16 sm:px-8 md:py-24">
          {sent ? (
            <div className="max-w-xl border border-prime-line bg-white p-8 md:p-10">
              <p className="prime-eyebrow mb-3 text-prime-gold">Received</p>
              <h2 className="font-display text-display-lg text-prime-ink">Thank you</h2>
              <KeyLine className="mt-5 max-w-[5rem]" />
              <p className="mt-5 text-sm font-medium leading-relaxed text-prime-muted">
                Our partnerships team will reach out shortly.
              </p>
            </div>
          ) : (
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <div>
                <PageHeader
                  dense
                  eyebrow="Inquiry"
                  title="Tell us about your home"
                  lede="Share a few details and we’ll follow up with next steps."
                />
              </div>
              <form onSubmit={onSubmit} className="space-y-4 border border-prime-line bg-white p-6 sm:p-8">
                {error ? <p className="text-sm text-red-700">{error}</p> : null}
                <input
                  required
                  className="prime-input"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
                <input
                  required
                  type="email"
                  className="prime-input"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
                <input
                  required
                  className="prime-input"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                />
                <input
                  className="prime-input"
                  placeholder="Compound / location"
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                />
                <textarea
                  className="prime-input min-h-[120px]"
                  placeholder="Tell us about your property"
                  value={form.details}
                  onChange={(e) => setField('details', e.target.value)}
                />
                <button type="submit" className="prime-btn-gold w-fit">
                  Submit inquiry
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
