import { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  AdminPageHeader,
  ImageUploadField,
  MoveButtons,
  reorderList,
} from '../../components/admin/AdminUi';

const emptyForm = {
  name: '',
  region: '',
  unitCount: 0,
  image: '',
  showOnHome: true,
  published: true,
  kwentraProjectId: '',
  kwentraDestinationId: '',
};

export default function AdminCompoundsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.adminGetCompounds();
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.adminCreateCompound(form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function save(id, patch) {
    const data = await api.adminUpdateCompound(id, patch);
    setItems((prev) => prev.map((c) => (c.id === id ? data.item : c)));
  }

  async function remove(id) {
    if (!confirm('Delete this compound?')) return;
    const data = await api.adminDeleteCompound(id);
    setItems(data.items || []);
  }

  async function move(index, dir) {
    const next = reorderList(items, index, index + dir);
    setItems(next);
    await api.adminReorderCompounds(next.map((c) => c.id));
  }

  return (
    <div>
      <AdminPageHeader
        title="Projects"
        lede="Kwentra projects/properties live under destinations. Link each with a Kwentra project ID; cover photos stay in Cloudinary here."
      />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <form onSubmit={create} className="mb-10 border border-prime-line bg-prime-surface p-5">
        <h2 className="mb-4 font-display text-lg font-bold">Add / overlay project</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              Name
            </span>
            <input
              className="prime-input"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              Destination / region
            </span>
            <input
              className="prime-input"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              Kwentra project ID
            </span>
            <input
              className="prime-input"
              value={form.kwentraProjectId}
              placeholder="property / project id"
              onChange={(e) => setForm((f) => ({ ...f, kwentraProjectId: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              Kwentra destination ID
            </span>
            <input
              className="prime-input"
              value={form.kwentraDestinationId}
              placeholder="parent destination id"
              onChange={(e) => setForm((f) => ({ ...f, kwentraDestinationId: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              Unit count
            </span>
            <input
              className="prime-input"
              type="number"
              min="0"
              value={form.unitCount}
              onChange={(e) => setForm((f) => ({ ...f, unitCount: Number(e.target.value) }))}
            />
          </label>
        </div>
        <ImageUploadField
          className="mt-4"
          label="Photo"
          value={form.image}
          folder="compounds"
          ratio="4:3 or 3:2"
          size="1200×900"
          onChange={(url) => setForm((f) => ({ ...f, image: url }))}
        />
        <button type="submit" className="prime-btn mt-4" disabled={busy}>
          {busy ? 'Saving…' : 'Create compound'}
        </button>
      </form>

      <div className="space-y-4">
        {items.map((c, index) => (
          <div key={c.id} className="border border-prime-line bg-prime-surface p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <input
                className="prime-input max-w-xs font-semibold"
                value={c.name}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x))
                  )
                }
                onBlur={(e) => save(c.id, { name: e.target.value })}
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-prime-muted">
                  <input
                    type="checkbox"
                    checked={c.published !== false}
                    onChange={(e) => save(c.id, { published: e.target.checked })}
                  />
                  Published
                </label>
                <MoveButtons
                  disableUp={index === 0}
                  disableDown={index === items.length - 1}
                  onUp={() => move(index, -1)}
                  onDown={() => move(index, 1)}
                />
                <button
                  type="button"
                  className="text-xs font-semibold uppercase tracking-wider text-red-600"
                  onClick={() => remove(c.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                  Region
                </span>
                <input
                  className="prime-input"
                  value={c.region || ''}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, region: e.target.value } : x))
                    )
                  }
                  onBlur={(e) => save(c.id, { region: e.target.value })}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                  Unit count
                </span>
                <input
                  className="prime-input"
                  type="number"
                  value={c.unitCount || 0}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x) =>
                        x.id === c.id ? { ...x, unitCount: Number(e.target.value) } : x
                      )
                    )
                  }
                  onBlur={(e) => save(c.id, { unitCount: Number(e.target.value) })}
                />
              </label>
            </div>
            <ImageUploadField
              className="mt-4"
              label="Photo"
              value={c.image}
              folder="compounds"
              ratio="4:3 or 3:2"
              size="1200×900"
              onChange={(url) => {
                setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, image: url } : x)));
                save(c.id, { image: url });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
