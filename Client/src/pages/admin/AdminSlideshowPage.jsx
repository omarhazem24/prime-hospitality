import { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  AdminPageHeader,
  ImageUploadField,
  MoveButtons,
  reorderList,
} from '../../components/admin/AdminUi';

export default function AdminSlideshowPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.adminGetSlideshow();
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function addSlide() {
    setBusy(true);
    setError('');
    try {
      const data = await api.adminCreateSlide({
        image:
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2200&q=85',
        alt: 'New slide',
        enabled: true,
      });
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSlide(id, patch) {
    const data = await api.adminUpdateSlide(id, patch);
    setItems((prev) => prev.map((s) => (s.id === id ? data.item : s)));
  }

  async function remove(id) {
    if (!confirm('Delete this slide?')) return;
    const data = await api.adminDeleteSlide(id);
    setItems(data.items || []);
  }

  async function move(index, dir) {
    const next = reorderList(items, index, index + dir);
    setItems(next);
    await api.adminReorderSlideshow(next.map((s) => s.id));
  }

  return (
    <div>
      <AdminPageHeader
        title="Homepage slideshow"
        lede="Full-bleed hero images on the landing page."
        actions={
          <button type="button" className="prime-btn" disabled={busy} onClick={addSlide}>
            Add slide
          </button>
        }
      />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-4">
        {items.map((slide, index) => (
          <div key={slide.id} className="border border-prime-line bg-prime-surface p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">Slide {index + 1}</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-prime-muted">
                  <input
                    type="checkbox"
                    checked={slide.enabled !== false}
                    onChange={(e) => saveSlide(slide.id, { enabled: e.target.checked })}
                  />
                  Enabled
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
                  onClick={() => remove(slide.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <ImageUploadField
              label="Image"
              value={slide.image}
              folder="slideshow"
              ratio="16:9"
              size="1920×1080"
              onChange={(url) => {
                setItems((prev) => prev.map((s) => (s.id === slide.id ? { ...s, image: url } : s)));
                saveSlide(slide.id, { image: url });
              }}
            />
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
                Alt text
              </span>
              <input
                className="prime-input"
                value={slide.alt || ''}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((s) => (s.id === slide.id ? { ...s, alt: e.target.value } : s))
                  )
                }
                onBlur={(e) => saveSlide(slide.id, { alt: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
