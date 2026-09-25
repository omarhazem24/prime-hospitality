import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import PageHeader from '../components/ui/PageHeader';
import { brand } from '../theme/brand';
import { useState } from 'react';
import api from '../api/client';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.sendContact({ name, email, message });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send message');
    }
  }

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-prime px-5 py-24 sm:px-8 md:py-28">
        <PageHeader
          eyebrow="Contact"
          title="Talk to Prime"
          lede="Questions about a stay, partnership, or booking — we’re here."
        />
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="space-y-6">
            <div className="border-t border-prime-line pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-prime-gold">
                Email
              </p>
              <p className="mt-2 text-sm font-medium text-prime-ink">{brand.email}</p>
            </div>
            <div className="border-t border-prime-line pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-prime-gold">
                Phone
              </p>
              <p className="mt-2 text-sm font-medium text-prime-ink">{brand.phoneDisplay}</p>
            </div>
            <div className="border-t border-prime-line pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-prime-gold">
                Studio
              </p>
              <p className="mt-2 text-sm font-medium text-prime-ink">{brand.address}</p>
            </div>
          </div>

          {sent ? (
            <div className="border border-prime-line bg-white p-8">
              <p className="font-display text-2xl font-bold text-prime-ink">Message sent</p>
              <p className="mt-3 text-sm text-prime-muted">Thanks — we&apos;ll be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 border border-prime-line bg-white p-6 sm:p-8">
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <input
                required
                className="prime-input"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                required
                type="email"
                className="prime-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <textarea
                required
                className="prime-input min-h-[140px]"
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button type="submit" className="prime-btn">
                Send message
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
