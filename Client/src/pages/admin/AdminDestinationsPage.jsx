import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Pencil, Plus } from 'lucide-react';
import api from '../../api/client';
import { AdminPageHeader, ImageUploadField, MoveButtons, reorderList } from '../../components/admin/AdminUi';
import { Badge, ConfirmDialog, Drawer, EmptyState, Field, Toggle, useToast } from '../../components/admin/kit';

const EMPTY = { name: '', description: '', image: '', showOnHome: true, published: true, kwentraDestinationId: '' };

function DestinationEditor({ open, destination, onClose, onSaved, onDelete, stats }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm(destination ? { ...EMPTY, ...destination } : EMPTY);
  }, [open, destination]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    if (!form.name.trim()) return toast.error('Give the destination a name.');
    setBusy(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        image: form.image,
        showOnHome: form.showOnHome,
        published: form.published,
        kwentraDestinationId: form.kwentraDestinationId,
      };
      if (destination) await api.adminUpdateDestination(destination.id, body);
      else await api.adminCreateDestination(body);
      onSaved(destination ? 'Destination saved.' : 'Destination created.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const s = destination ? stats[destination.id] || { properties: 0 } : { properties: 0 };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={destination ? destination.name : 'New destination'}
      subtitle={destination ? `${s.properties} properties · ${s.unitTypes || 0} unit types` : 'Top level: Destination › Property › Unit type'}
      footer={
        <div className="flex items-center justify-between gap-3">
          {destination ? (
            <button
              type="button"
              className="text-xs font-semibold text-red-600 disabled:opacity-40"
              disabled={s.properties > 0}
              title={s.properties > 0 ? 'Move or delete its properties first' : undefined}
              onClick={() => onDelete(destination)}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="prime-btn" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : destination ? 'Save changes' : 'Create destination'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-6">
          <Toggle checked={form.published} onChange={(published) => set({ published })} label="Published" hint="Shown in search filters" />
          <Toggle checked={form.showOnHome} onChange={(showOnHome) => set({ showOnHome })} label="Show on homepage" hint="Destination tiles section" />
        </div>
        <Field label="Name">
          <input className="prime-input" value={form.name} placeholder="e.g. North Coast" onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea className="prime-input min-h-[90px]" value={form.description || ''} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <ImageUploadField label="Cover photo" value={form.image} folder="destinations" ratio="4:3" size="1200×900" onChange={(image) => set({ image })} />
        <Field label="Kwentra destination ID" hint="Filled automatically by Import & sync.">
          <input className="prime-input max-w-xs" value={form.kwentraDestinationId || ''} onChange={(e) => set({ kwentraDestinationId: e.target.value })} />
        </Field>
      </div>
    </Drawer>
  );
}

/** Destinations — top level of the inventory: Destination › Property › Unit type */
export default function AdminDestinationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [compounds, setCompounds] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState({ open: false, destination: null });
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    const [d, c, u] = await Promise.all([api.adminGetDestinations(), api.adminGetCompounds(), api.adminGetUnits()]);
    setItems(d.items || []);
    setCompounds(c.items || []);
    setUnits(u.items || []);
  }

  useEffect(() => {
    load()
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const stats = useMemo(() => {
    const map = {};
    const destinationOf = {};
    for (const c of compounds) {
      destinationOf[c.id] = c.destinationId;
      const s = (map[c.destinationId] ||= { properties: 0, unitTypes: 0 });
      s.properties += 1;
    }
    for (const u of units) {
      const s = map[destinationOf[u.compoundId]];
      if (s) s.unitTypes += 1;
    }
    return map;
  }, [compounds, units]);

  async function quickSave(d, patch) {
    setItems((prev) => prev.map((x) => (x.id === d.id ? { ...x, ...patch } : x)));
    try {
      await api.adminUpdateDestination(d.id, patch);
    } catch (err) {
      toast.error(err.message);
      await load();
    }
  }

  async function move(index, dir) {
    const next = reorderList(items, index, index + dir);
    setItems(next);
    try {
      await api.adminReorderDestinations(next.map((d) => d.id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function doDelete() {
    try {
      const data = await api.adminDeleteDestination(confirmDelete.id);
      setItems(data.items || []);
      toast.success(`Deleted “${confirmDelete.name}”.`);
      setConfirmDelete(null);
      setEditor({ open: false, destination: null });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Destinations"
        lede="Top of the inventory: Destination › Property › Unit type. The order here drives the homepage tiles and search filters."
        actions={
          <button type="button" className="prime-btn" onClick={() => setEditor({ open: true, destination: null })}>
            <Plus size={14} /> Add destination
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-prime-muted">Loading…</p>
      ) : items.length ? (
        <div className="overflow-x-auto border border-prime-line bg-prime-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-prime-line text-[10px] uppercase tracking-[0.16em] text-prime-muted">
              <tr>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Destination</th>
                <th className="px-3 py-3">Inventory</th>
                <th className="px-3 py-3">Homepage</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((d, index) => {
                const s = stats[d.id] || { properties: 0, unitTypes: 0 };
                return (
                  <tr key={d.id} className="border-b border-prime-line/70 hover:bg-prime-mist/50">
                    <td className="px-3 py-3">
                      <MoveButtons disableUp={index === 0} disableDown={index === items.length - 1} onUp={() => move(index, -1)} onDown={() => move(index, 1)} />
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" className="flex items-center gap-3 text-start" onClick={() => setEditor({ open: true, destination: d })}>
                        <span className="h-11 w-14 shrink-0 overflow-hidden border border-prime-line bg-prime-mist">
                          {d.image ? <img src={d.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium hover:underline">{d.name}</span>
                          <span className="line-clamp-1 block max-w-sm text-xs text-prime-muted">{d.description || 'No description'}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/admin/compounds?destination=${encodeURIComponent(d.id)}`} className="text-prime-ink hover:underline">
                        {s.properties} properties
                      </Link>
                      <span className="block text-xs text-prime-muted">{s.unitTypes} unit types</span>
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => quickSave(d, { showOnHome: d.showOnHome === false })}>
                        <Badge tone={d.showOnHome === false ? 'gray' : 'gold'}>{d.showOnHome === false ? 'Not shown' : 'Shown'}</Badge>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button type="button" onClick={() => quickSave(d, { published: d.published === false })}>
                          <Badge tone={d.published === false ? 'gray' : 'green'}>{d.published === false ? 'Hidden' : 'Published'}</Badge>
                        </button>
                        {d.kwentraDestinationId ? <Badge tone="blue">Kwentra #{d.kwentraDestinationId}</Badge> : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-end">
                      <button
                        type="button"
                        className="inline-grid h-8 w-8 place-items-center border border-prime-line hover:border-prime-ink"
                        onClick={() => setEditor({ open: true, destination: d })}
                        aria-label={`Edit ${d.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={MapPin} title="No destinations yet" subtitle="Sync from Kwentra or add your first destination." />
      )}

      <DestinationEditor
        open={editor.open}
        destination={editor.destination}
        stats={stats}
        onClose={() => setEditor({ open: false, destination: null })}
        onSaved={async (msg) => {
          toast.success(msg);
          setEditor({ open: false, destination: null });
          await load();
        }}
        onDelete={setConfirmDelete}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        danger
        title="Delete destination?"
        message={confirmDelete ? `“${confirmDelete.name}” will be removed from the website.` : ''}
        confirmText="Delete"
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
