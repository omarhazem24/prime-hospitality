import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { AdminPageHeader } from '../../components/admin/AdminUi';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminDashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const cards = data
    ? [
        { label: 'Units', value: data.counts.units, to: '/admin/units' },
        { label: 'Published', value: data.counts.publishedUnits, to: '/admin/units' },
        { label: 'Featured', value: data.counts.featuredUnits, to: '/admin/units' },
        { label: 'Compounds', value: data.counts.compounds, to: '/admin/compounds' },
        { label: 'Slides', value: data.counts.slides, to: '/admin/slideshow' },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        lede="Manage homepage content, inventory order, and advertising pixels."
      />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="border border-prime-line bg-prime-surface p-5 transition hover:border-prime-gold"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              {c.label}
            </p>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>
      {data && !data.supabaseConfigured ? (
        <div className="mt-8 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Supabase is not configured — using local JSON. Add <code>SUPABASE_URL</code> and{' '}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>Server/.env</code>, then run{' '}
          <code>Server/supabase/schema.sql</code> in the SQL editor.
        </div>
      ) : null}
      {data && !data.cloudinaryConfigured ? (
        <div className="mt-4 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cloudinary is not configured. Add <code>CLOUDINARY_*</code> keys to{' '}
          <code>Server/.env</code> for slideshow and compound image uploads. Unit photos use Google
          Drive folders only.
        </div>
      ) : null}
      {data?.storage ? (
        <p className="mt-6 text-xs text-prime-muted">
          Database: {data.storage.database} · Unit photos: {data.storage.unitPhotos} · Other photos:{' '}
          {data.storage.otherPhotos}
          {data.updatedAt ? ` · Updated ${new Date(data.updatedAt).toLocaleString()}` : ''}
        </p>
      ) : data?.updatedAt ? (
        <p className="mt-6 text-xs text-prime-muted">
          Store updated {new Date(data.updatedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
