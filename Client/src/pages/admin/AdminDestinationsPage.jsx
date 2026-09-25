import { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  AdminPageHeader,
  ImageUploadField,
  MoveButtons,
  reorderList,
} from '../../components/admin/AdminUi';

/** Home destinations = compounds with showOnHome */
export default function AdminDestinationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const data = await api.adminGetCompounds();
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function save(id, patch) {
    const data = await api.adminUpdateCompound(id, patch);
    setItems((prev) => prev.map((c) => (c.id === id ? data.item : c)));
  }

  async function moveHome(index, dir) {
    const home = items.filter((c) => c.showOnHome !== false);
    const nextHome = reorderList(home, index, index + dir);
    const rest = items.filter((c) => c.showOnHome === false);
    const next = [...nextHome, ...rest];
    setItems(next);
    await api.adminReorderCompounds(next.map((c) => c.id));
  }

  const homeItems = items.filter((c) => c.showOnHome !== false);

  return (
    <div>
      <AdminPageHeader
        title="Destinations"
        lede="Pulled from Kwentra when connected. CMS controls cover photos (Cloudinary), homepage visibility, and order. Each destination contains projects."
      />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="mb-8 space-y-3">
        {items.map((c) => (
          <label
            key={`toggle-${c.id}`}
            className="flex items-center justify-between gap-3 border border-prime-line bg-prime-surface px-4 py-3"
          >
            <span className="text-sm font-medium">
              {c.name} <span className="text-prime-muted">· {c.region}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-prime-muted">
              Show on home
              <input
                type="checkbox"
                checked={c.showOnHome !== false}
                onChange={(e) => save(c.id, { showOnHome: e.target.checked })}
              />
            </span>
          </label>
        ))}
      </div>

      <h2 className="mb-4 font-display text-xl font-bold">Home order & photos</h2>
      <div className="space-y-4">
        {homeItems.map((c, index) => (
          <div key={c.id} className="border border-prime-line bg-prime-surface p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">
                {c.name} <span className="text-sm font-normal text-prime-muted">{c.region}</span>
              </p>
              <MoveButtons
                disableUp={index === 0}
                disableDown={index === homeItems.length - 1}
                onUp={() => moveHome(index, -1)}
                onDown={() => moveHome(index, 1)}
              />
            </div>
            <ImageUploadField
              label="Card image"
              value={c.image}
              folder="compounds"
              ratio="4:3"
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
