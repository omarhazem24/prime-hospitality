import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import CompoundGrid from '../components/home/CompoundGrid';
import PageHeader from '../components/ui/PageHeader';
import { brand } from '../theme/brand';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export function StaticPage({ title, eyebrow, lede, children, wide = false }) {
  return (
    <div>
      <Header />
      <main className={`mx-auto px-5 py-24 sm:px-8 md:py-28 ${wide ? 'max-w-prime' : 'max-w-3xl'}`}>
        <PageHeader eyebrow={eyebrow} title={title} lede={lede} />
        <div className="space-y-5 text-[15px] font-medium leading-relaxed text-prime-ink/80">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function CompoundsPage() {
  return (
    <div>
      <Header />
      <main className="pt-16">
        <div className="mx-auto max-w-prime px-5 pt-12 sm:px-8">
          <PageHeader
            eyebrow="Destinations"
            title="Our compounds"
            lede="Handpicked destinations across boutique homes and coastal escapes."
          />
        </div>
        <CompoundGrid hideIntro />
      </main>
      <Footer />
    </div>
  );
}

export function FaqPage() {
  const [open, setOpen] = useState(0);
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .getFaqs()
      .then((res) => {
        if (!cancelled) setFaqs(res.items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-prime px-5 py-24 sm:px-8 md:py-28">
        <PageHeader
          eyebrow="Support"
          title="FAQs"
          lede="Clear answers before you book — and after you arrive."
        />
        <div className="mx-auto max-w-3xl">
          {faqs.map((item, i) => (
            <div key={item.q} className="border-t border-prime-line last:border-b">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-5 text-start transition hover:text-prime-gold-deep"
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <span className="font-display text-lg font-bold tracking-[-0.02em] text-prime-ink">
                  <span className="me-3 text-prime-gold">{String(i + 1).padStart(2, '0')}</span>
                  {item.q}
                </span>
                <span className="text-prime-muted">{open === i ? '−' : '+'}</span>
              </button>
              {open === i ? (
                <p className="pb-6 ps-12 text-sm font-medium leading-relaxed text-prime-muted">
                  {item.a}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function LegalPage({ kind }) {
  const titles = {
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    'refund-policy': 'Refund Policy',
  };
  const title = titles[kind] || 'Legal';
  return (
    <StaticPage eyebrow="Legal" title={title} lede="Policies that keep stays clear and fair.">
      <p>
        Placeholder legal copy for {title}. Final policies will be published before launch.
      </p>
      <p className="text-sm text-prime-muted">
        Contact {brand.email} for questions about this document.
      </p>
    </StaticPage>
  );
}

export function AboutPage() {
  return (
    <div>
      <Header />
      <main>
        <section className="bg-prime-night px-5 pb-16 pt-28 text-white sm:px-8 md:pb-20 md:pt-32">
          <div className="mx-auto max-w-prime">
            <PageHeader
              tone="dark"
              eyebrow="About"
              title="Hospitality with a private key."
              lede="Boutique stays across Egypt’s finest compounds — comfort, craft, and calm."
            />
          </div>
        </section>
        <section className="mx-auto max-w-prime px-5 py-16 sm:px-8 md:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="space-y-5 text-[15px] font-medium leading-relaxed text-prime-ink/80 md:text-base">
              <p>
                Prime Hospitality curates homes worth returning to — from Sahel mornings to New Cairo
                evenings — with the warmth of a private residence and the standards of a refined hotel.
              </p>
              <p className="text-prime-muted">
                Every stay is considered: design-led presentation, attentive guest care, and compounds
                chosen for atmosphere as much as location.
              </p>
              <Link to="/search" className="prime-btn mt-4 inline-flex">
                Explore stays
              </Link>
            </div>
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
