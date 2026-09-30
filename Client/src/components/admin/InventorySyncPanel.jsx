import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { cn } from '../../utils/cn';

const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted';

const ACTION_STYLE = {
  create: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  update: 'bg-amber-50 text-amber-800 border-amber-200',
  unchanged: 'bg-prime-mist text-prime-muted border-prime-line',
  hide: 'bg-red-50 text-red-700 border-red-200',
  'needs-destination': 'bg-red-50 text-red-700 border-red-200',
};

function Badge({ action }) {
  return (
    <span className={cn('inline-block border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', ACTION_STYLE[action])}>
      {action === 'needs-destination' ? 'needs destination' : action}
    </span>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function KwentraCard({ onChanged }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminKwentraStatus().then(setStatus).catch((err) => setError(err.message));
  }, []);

  async function syncNow() {
    setBusy(true);
    setError('');
    try {
      const report = await api.adminKwentraSync();
      setStatus((s) => ({ ...s, last: report }));
      onChanged?.();
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  const last = status?.last;
  return (
    <section className="border border-prime-line bg-prime-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">Kwentra PMS</h2>
          <p className="mt-1 max-w-xl text-sm text-prime-muted">
            Pulls destinations, properties, unit types (size, beds, baths, max guests, amenities, price) and room numbers
            from Kwentra into the website. Photos, featured and published stay controlled here.
          </p>
        </div>
        <span
          className={cn(
            'border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
            status?.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-prime-line bg-prime-mist text-prime-muted'
          )}
        >
          {status ? (status.configured ? 'Connected' : 'Not connected') : '…'}
        </span>
      </div>

      {status && !status.configured ? (
        <p className="mt-4 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Add the Kwentra API user to <span className="font-mono text-xs">Server/.env</span> (KWENTRA_USERNAME, KWENTRA_PASSWORD,
          KWENTRA_TENANT_ID) and restart the API. Until then, units come from the spreadsheet import and the admin.
        </p>
      ) : null}

      {status?.configured ? (
        <p className="mt-4 text-sm text-prime-muted">
          {status.autoSyncMinutes ? `Syncs automatically every ${status.autoSyncMinutes} minutes.` : 'Automatic sync is off.'}{' '}
          {last ? `Last sync ${formatTime(last.finishedAt)}.` : 'No sync yet since the API started.'}
        </p>
      ) : null}

      {last ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['Unit types', last.units],
            ['Properties', last.properties],
            ['Destinations', last.destinations],
          ].map(([label, counts]) => (
            <div key={label} className="border border-prime-line px-4 py-3">
              <p className={labelCls}>{label}</p>
              <p className="text-sm">
                <span className="font-semibold">{counts?.created || 0}</span> new ·{' '}
                <span className="font-semibold">{counts?.updated || 0}</span> updated
                {counts?.unchanged != null ? ` · ${counts.unchanged} unchanged` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {last?.errors?.length ? (
        <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {last.errors.map((e) => (
            <p key={e.kind + e.message}>
              <span className="font-semibold capitalize">{e.kind}:</span> {e.message}
            </p>
          ))}
          {last.needFromKwentra?.length ? (
            <ul className="mt-2 list-disc ps-5 text-xs">
              {last.needFromKwentra.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <button type="button" className="prime-btn mt-5" disabled={busy || !status?.configured} onClick={syncNow}>
        {busy ? 'Syncing…' : 'Sync now'}
      </button>
    </section>
  );
}

function ImportCard({ onChanged }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [destinationId, setDestinationId] = useState('');
  const [preview, setPreview] = useState(null);
  const [applied, setApplied] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminGetDestinations()
      .then((d) => setDestinations(d.items || []))
      .catch(() => {});
  }, []);

  async function run(nextFile, { apply = false, dest = destinationId } = {}) {
    setBusy(true);
    setError('');
    try {
      const report = await api.adminImportInventory(nextFile, { apply, destinationId: dest });
      if (apply) {
        setApplied(report);
        setPreview(null);
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        onChanged?.();
      } else {
        setPreview(report);
        setApplied(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function onPick(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(null);
    setApplied(null);
    run(picked);
  }

  const needsDestination = preview?.properties?.some((p) => p.action === 'needs-destination');
  const report = applied || preview;

  return (
    <section className="border border-prime-line bg-prime-surface p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold">Import property fact sheet</h2>
      <p className="mt-1 max-w-2xl text-sm text-prime-muted">
        Upload a workbook in the “Prime Residence New Cairo.xlsx” layout: one property row, then one “Room Type” row per unit
        type (size, number of units, unit numbers, baths, beds, max adults, description, amenities, floor). You’ll see a
        preview before anything is saved. Re-importing an updated sheet updates the same unit types.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="cursor-pointer border border-prime-night bg-prime-night px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-prime-sand">
          {file ? 'Choose another file' : 'Choose .xlsx file'}
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onPick} disabled={busy} />
        </label>
        {file ? <span className="text-sm text-prime-muted">{file.name}</span> : null}
        {busy ? <span className="text-sm text-prime-muted">Reading…</span> : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {needsDestination ? (
        <label className="mt-5 block max-w-sm">
          <span className={labelCls}>Destination for the new property</span>
          <select
            className="prime-input"
            value={destinationId}
            onChange={(e) => {
              setDestinationId(e.target.value);
              if (file) run(file, { dest: e.target.value });
            }}
          >
            <option value="">Select destination…</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {report ? (
        <div className="mt-6 space-y-5">
          {applied ? (
            <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Imported — {applied.summary.unitsCreated} unit types created, {applied.summary.unitsUpdated} updated,{' '}
              {applied.summary.unitsHidden} old placeholders hidden.
            </p>
          ) : (
            <p className="text-sm text-prime-muted">
              Preview — {report.summary.unitsCreated} to create, {report.summary.unitsUpdated} to update,{' '}
              {report.summary.unitsHidden} old placeholders to hide.
            </p>
          )}

          {report.properties.map((p) => (
            <div key={p.name} className="border border-prime-line">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-prime-line bg-prime-mist/60 px-4 py-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-prime-muted">
                    {p.destination || 'No destination yet'}
                    {p.changes.length ? ` · property details: ${p.changes.join(', ')}` : ''}
                  </p>
                </div>
                <Badge action={p.action} />
              </div>
              <table className="w-full text-left text-sm">
                <tbody>
                  {p.units.map((u) => (
                    <tr key={`${u.action}-${u.title}`} className="border-b border-prime-line/70 last:border-0">
                      <td className="px-4 py-2.5">{u.title}</td>
                      <td className="px-4 py-2.5 text-xs text-prime-muted">
                        {u.fields?.length ? u.fields.join(', ') : u.unitType || ''}
                      </td>
                      <td className="px-4 py-2.5 text-end">
                        <Badge action={u.action} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {report.warnings?.length ? (
            <ul className="list-disc space-y-1 border border-amber-200 bg-amber-50 py-2 pe-3 ps-8 text-sm text-amber-900">
              {report.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          {preview ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="prime-btn"
                disabled={busy || (needsDestination && !destinationId)}
                onClick={() => run(file, { apply: true })}
              >
                {busy ? 'Importing…' : 'Apply import'}
              </button>
              <button
                type="button"
                className="prime-btn-outline"
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default function InventorySyncPanel({ onChanged }) {
  return (
    <div className="space-y-6">
      <KwentraCard onChanged={onChanged} />
      <ImportCard onChanged={onChanged} />
    </div>
  );
}
