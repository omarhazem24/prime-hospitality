import { useState } from 'react';
import api from '../../api/client';
import { cn } from '../../utils/cn';

export function AspectHint({ ratio, size }) {
  return (
    <p className="mt-1 text-[11px] text-prime-muted">
      Recommended aspect ratio: <span className="font-semibold text-prime-ink">{ratio}</span>
      {size ? <> · ideal {size}</> : null}
    </p>
  );
}

export function AdminPageHeader({ title, lede, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink sm:text-3xl">
          {title}
        </h1>
        {lede ? <p className="mt-1.5 max-w-xl text-sm text-prime-muted">{lede}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function ImageUploadField({
  label,
  value,
  onChange,
  folder = 'site',
  ratio,
  size,
  className,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.adminUpload(file, folder);
      onChange(res.url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn(className)}>
      {label ? (
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
          {label}
        </label>
      ) : null}
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <img src={value} alt="" className="h-24 w-36 object-cover border border-prime-line bg-prime-mist" />
        ) : (
          <div className="grid h-24 w-36 place-items-center border border-dashed border-prime-line bg-prime-mist text-[11px] text-prime-muted">
            No image
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="url"
            className="prime-input"
            placeholder="https://… or upload below"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <label className="inline-flex cursor-pointer items-center gap-2 border border-prime-line bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-prime-ink transition hover:border-prime-gold">
            {busy ? 'Uploading…' : 'Upload to Cloudinary'}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={onFile} />
          </label>
          {ratio ? <AspectHint ratio={ratio} size={size} /> : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function MoveButtons({ onUp, onDown, disableUp, disableDown }) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={disableUp}
        onClick={onUp}
        className="border border-prime-line px-2 py-1 text-xs disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={disableDown}
        onClick={onDown}
        className="border border-prime-line px-2 py-1 text-xs disabled:opacity-30"
      >
        ↓
      </button>
    </div>
  );
}

export function reorderList(items, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
