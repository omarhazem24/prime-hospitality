import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import PageHeader from '../components/ui/PageHeader';
import { Link } from 'react-router-dom';

const ROLES = [
  { title: 'Guest Experience Associate', loc: 'New Cairo', type: 'Full-time' },
  { title: 'Property Operations Lead', loc: 'North Coast (seasonal)', type: 'Full-time' },
  { title: 'Interior Stylist (Freelance)', loc: 'Remote / Cairo', type: 'Contract' },
];

export default function CareersPage() {
  return (
    <div>
      <Header />
      <main className="mx-auto max-w-prime px-5 py-24 sm:px-8 md:py-28">
        <PageHeader
          eyebrow="Careers"
          title="Work with Prime"
          lede="Build a hospitality brand around craft and care. Open roles below — or send us a note."
        />
        <div className="border-t border-prime-line">
          {ROLES.map((r) => (
            <div
              key={r.title}
              className="flex flex-col gap-4 border-b border-prime-line py-7 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-prime-ink">
                  {r.title}
                </h2>
                <p className="mt-1.5 text-sm font-medium text-prime-muted">
                  {r.loc} · {r.type}
                </p>
              </div>
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-prime-ink transition hover:text-prime-gold-deep"
              >
                Apply
                <span className="inline-block h-px w-6 bg-prime-gold transition-all group-hover:w-10" />
              </Link>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
