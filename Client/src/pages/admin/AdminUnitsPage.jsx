import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import {
  AdminPageHeader,
  MoveButtons,
  reorderList,
  AspectHint,
} from '../../components/admin/AdminUi';

const emptyUnit = {
  title: '',
  slug: '',
  compoundId: '',
  city: '',
  propertyType: 'Apartment',
  bedrooms: 2,
  bathrooms: 2,
  areaSqm: 100,
  maxGuests: 4,
  pricePerNight: 10000,
  currency: 'EGP',
  featured: false,
  published: true,
  description: '',
  amenities: '',
  images: [],
  driveFolderUrl: '',
  kwentraRoomTypeId: '',
};

export default function AdminUnitsPage() {
  const [items, setItems] = useState([]);
  const [home, setHome] = useState([]);
  const [compounds, setCompounds] = useState([]);
  const [form, setForm] = useState(emptyUnit);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [tab, setTab] = useState('all');

  async function load() {
    const [unitsData, compoundsData] = await Promise.all([
      api.adminGetUnits(),
      api.adminGetCompounds(),
    ]);
    setItems(unitsData.items || []);
    setHome(unitsData.home || []);
    setCompounds(compoundsData.items || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const editing = useMemo(
    () => (editingId ? items.find((u) => u.id === editingId) : null),
    [editingId, items]
  );

  useEffect(() => {
    if (!editing) return;
    setForm({
      title: editing.title || '',
      slug: editing.slug || '',
      compoundId: editing.compoundId || '',
      city: editing.city || '',
      propertyType: editing.propertyType || 'Apartment',
      bedrooms: editing.bedrooms || 1,
      bathrooms: editing.bathrooms || 1,
      areaSqm: editing.areaSqm || 0,
      maxGuests: editing.maxGuests || 2,
      pricePerNight: editing.pricePerNight || 0,
      currency: editing.currency || 'EGP',
      featured: Boolean(editing.featured),
      published: editing.published !== false,
      description: editing.description || '',
      amenities: (editing.amenities || []).join(', '),
      images: editing.images || [],
      driveFolderUrl: editing.driveFolderUrl || '',
      kwentraRoomTypeId: editing.kwentraRoomTypeId || '',
    });
  }, [editing]);

  function payloadFromForm() {
    return {
      ...form,
      amenities: String(form.amenities || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      images: form.images || [],
      driveFolderUrl: form.driveFolderUrl || '',
      kwentraRoomTypeId: form.kwentraRoomTypeId || '',
    };
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = payloadFromForm();
      if (editingId) await api.adminUpdateUnit(editingId, body);
      else await api.adminCreateUnit(body);
      setEditingId(null);
      setForm(emptyUnit);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeatured(unit) {
    await api.adminUpdateUnit(unit.id, { featured: !unit.featured });
    await load();
  }

  async function remove(id) {
    if (!confirm('Delete this unit?')) return;
    await api.adminDeleteUnit(id);
    await load();
  }

  async function moveSearch(index, dir) {
    const next = reorderList(items, index, index + dir);
    setItems(next);
    await api.adminReorderSearchUnits(next.map((u) => u.id));
  }

  async function moveHome(index, dir) {
    const next = reorderList(home, index, index + dir);
    setHome(next);
    await api.adminReorderHomeUnits(next.map((u) => u.id));
  }

  async function loadDriveFolder() {
    const url = String(form.driveFolderUrl || '').trim();
    if (!url) {
      setError('Paste a Google Drive folder link first');
      return;
    }
    setDriveBusy(true);
    setError('');
    try {
      const data = await api.adminDriveFolderImages(url);
      const urls = data.urls || (data.images || []).map((i) => i.url);
      setForm((f) => ({
        ...f,
        driveFolderUrl: url,
        images: urls,
      }));
    } catch (err) {
      setError(err.message || 'Could not load Drive folder');
    } finally {
      setDriveBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Units"
        lede="Full listing control — create/edit, homepage featured order, and search page order. Unit photos come from a shared Google Drive folder."
        actions={
          <div className="flex gap-2">
            {['all', 'home', 'form'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? 'bg-prime-night px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-prime-sand'
                    : 'border border-prime-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]'
                }
              >
                {t === 'all' ? 'Search order' : t === 'home' ? 'Home featured' : 'Create / edit'}
              </button>
            ))}
          </div>
        }
      />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {tab === 'all' && (
        <div className="overflow-x-auto border border-prime-line bg-prime-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-prime-line text-[10px] uppercase tracking-[0.16em] text-prime-muted">
              <tr>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">Compound</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Flags</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((u, index) => (
                <tr key={u.id} className="border-b border-prime-line/70">
                  <td className="px-3 py-3">
                    <MoveButtons
                      disableUp={index === 0}
                      disableDown={index === items.length - 1}
                      onUp={() => moveSearch(index, -1)}
                      onDown={() => moveSearch(index, 1)}
                    />
                  </td>
                  <td className="px-3 py-3 font-medium">{u.title}</td>
                  <td className="px-3 py-3 text-prime-muted">{u.compound}</td>
                  <td className="px-3 py-3 tabular-nums">
                    {u.pricePerNight} {u.currency}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {u.featured ? 'Featured · ' : ''}
                    {u.published === false ? 'Hidden' : 'Published'}
                  </td>
                  <td className="px-3 py-3 text-end">
                    <button
                      type="button"
                      className="me-3 text-xs font-semibold uppercase tracking-wider"
                      onClick={() => {
                        setEditingId(u.id);
                        setTab('form');
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="me-3 text-xs font-semibold uppercase tracking-wider text-prime-muted"
                      onClick={() => toggleFeatured(u)}
                    >
                      {u.featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-wider text-red-600"
                      onClick={() => remove(u.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'home' && (
        <div className="space-y-3">
          <p className="text-sm text-prime-muted">
            Only featured units appear on the homepage. Reorder them here.
          </p>
          {home.map((u, index) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-prime-line bg-prime-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {u.images?.[0] ? (
                  <img src={u.images[0]} alt="" className="h-12 w-16 object-cover" referrerPolicy="no-referrer" />
                ) : null}
                <div>
                  <p className="font-medium">{u.title}</p>
                  <p className="text-xs text-prime-muted">{u.compound}</p>
                </div>
              </div>
              <MoveButtons
                disableUp={index === 0}
                disableDown={index === home.length - 1}
                onUp={() => moveHome(index, -1)}
                onDown={() => moveHome(index, 1)}
              />
            </div>
          ))}
          {!home.length ? <p className="text-sm text-prime-muted">No featured units yet.</p> : null}
        </div>
      )}

      {tab === 'form' && (
        <form onSubmit={submit} className="border border-prime-line bg-prime-surface p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              {editingId ? 'Edit unit' : 'Create unit'}
            </h2>
            {editingId ? (
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-wider text-prime-muted"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyUnit);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                Title
              </span>
              <input
                className="prime-input"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                Slug
              </span>
              <input
                className="prime-input"
                value={form.slug}
                placeholder="auto from title"
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                Compound
              </span>
              <select
                className="prime-input"
                value={form.compoundId}
                onChange={(e) => setForm((f) => ({ ...f, compoundId: e.target.value }))}
              >
                <option value="">Select…</option>
                {compounds.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                City
              </span>
              <input
                className="prime-input"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                Property type
              </span>
              <input
                className="prime-input"
                value={form.propertyType}
                onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}
              />
            </label>
            {[
              ['bedrooms', 'Bedrooms'],
              ['bathrooms', 'Bathrooms'],
              ['areaSqm', 'Area m²'],
              ['maxGuests', 'Max guests'],
              ['pricePerNight', 'Price / night'],
            ].map(([key, label]) => (
              <label key={key}>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                  {label}
                </span>
                <input
                  className="prime-input"
                  type="number"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                Kwentra room type ID
              </span>
              <input
                className="prime-input"
                value={form.kwentraRoomTypeId}
                placeholder="e.g. 3 (from PMS room_type.id)"
                onChange={(e) => setForm((f) => ({ ...f, kwentraRoomTypeId: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                Description
              </span>
              <textarea
                className="prime-input min-h-[100px]"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                Amenities (comma-separated)
              </span>
              <input
                className="prime-input"
                value={form.amenities}
                onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              Featured on homepage
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              />
              Published
            </label>
          </div>

          <div className="mt-6 border-t border-prime-line pt-6">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              Gallery — Google Drive folder
            </p>
            <AspectHint ratio="4:3 cover · 3:2 or 4:3 gallery" size="first image = listing card" />
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-prime-muted">
              Unit details pull from Kwentra when linked. Photos stay here — share a Drive folder as{' '}
              <span className="font-medium text-prime-ink">Anyone with the link</span>, paste the URL,
              then load. Set <span className="font-medium text-prime-ink">Kwentra room type ID</span> so
              availability and bookings sync.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                type="url"
                className="prime-input flex-1"
                placeholder="https://drive.google.com/drive/folders/…"
                value={form.driveFolderUrl}
                onChange={(e) => setForm((f) => ({ ...f, driveFolderUrl: e.target.value }))}
              />
              <button
                type="button"
                disabled={driveBusy}
                onClick={loadDriveFolder}
                className="shrink-0 border border-prime-night bg-prime-night px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-prime-sand disabled:opacity-60"
              >
                {driveBusy ? 'Loading…' : 'Load photos'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(form.images || []).map((src, i) => (
                <div key={`${src}-${i}`} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="h-20 w-28 border border-prime-line bg-prime-mist object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    className="absolute end-1 top-1 bg-black/70 px-1.5 text-[10px] text-white"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        images: f.images.filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    ×
                  </button>
                  <div className="absolute bottom-1 start-1 flex gap-0.5">
                    <button
                      type="button"
                      disabled={i === 0}
                      className="bg-black/70 px-1 text-[10px] text-white disabled:opacity-30"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          images: reorderList(f.images, i, i - 1),
                        }))
                      }
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={i === form.images.length - 1}
                      className="bg-black/70 px-1 text-[10px] text-white disabled:opacity-30"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          images: reorderList(f.images, i, i + 1),
                        }))
                      }
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {form.images?.length ? (
              <p className="mt-2 text-xs text-prime-muted">{form.images.length} photo(s) loaded</p>
            ) : null}
          </div>

          <button type="submit" className="prime-btn mt-6" disabled={busy}>
            {busy ? 'Saving…' : editingId ? 'Update unit' : 'Create unit'}
          </button>
        </form>
      )}
    </div>
  );
}
