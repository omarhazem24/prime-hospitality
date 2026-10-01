import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { AdminPageHeader, MoveButtons, reorderList } from '../../components/admin/AdminUi';
import { BilingualField, Card, Field, SaveBar, Tabs, useToast } from '../../components/admin/kit';

const TABS = [
  ['faqs', 'FAQs'],
  ['trustPoints', 'Why Prime points'],
  ['partners', 'Partner logos'],
];

const BLANK = {
  faqs: { q: '', a: '', qAr: '', aAr: '' },
  trustPoints: { title: '', body: '', titleAr: '', bodyAr: '' },
  partners: { name: '', logo: '' },
};

const HELP = {
  faqs: ['FAQ page', 'Questions on /faq. Arabic is shown to Arabic visitors when both question and answer are filled.', '/faq'],
  trustPoints: ['Homepage · Why Prime', 'Numbered points in the “Why Prime” homepage section (up to 12).', '/'],
  partners: ['Homepage · Partner logos', 'Logo strip on the homepage. Use a square or wide transparent PNG/SVG link.', '/'],
};

function ItemEditor({ kind, item, onChange }) {
  if (kind === 'faqs') {
    return (
      <div className="space-y-3">
        <BilingualField
          label="Question"
          value={{ en: item.q, ar: item.qAr }}
          onChange={(v) => onChange({ ...item, q: v.en, qAr: v.ar })}
        />
        <BilingualField
          label="Answer"
          multiline
          rows={3}
          value={{ en: item.a, ar: item.aAr }}
          onChange={(v) => onChange({ ...item, a: v.en, aAr: v.ar })}
        />
      </div>
    );
  }
  if (kind === 'trustPoints') {
    return (
      <div className="space-y-3">
        <BilingualField
          label="Title"
          value={{ en: item.title, ar: item.titleAr }}
          onChange={(v) => onChange({ ...item, title: v.en, titleAr: v.ar })}
        />
        <BilingualField
          label="Text"
          multiline
          rows={2}
          value={{ en: item.body, ar: item.bodyAr }}
          onChange={(v) => onChange({ ...item, body: v.en, bodyAr: v.ar })}
        />
      </div>
    );
  }
  return (
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
      <Field label="Name">
        <input className="prime-input" value={item.name || ''} onChange={(e) => onChange({ ...item, name: e.target.value })} />
      </Field>
      <Field label="Logo URL">
        <input type="url" className="prime-input" value={item.logo || ''} onChange={(e) => onChange({ ...item, logo: e.target.value })} />
      </Field>
      <div className="grid h-11 w-24 place-items-center border border-prime-line bg-white">
        {item.logo ? <img src={item.logo} alt="" className="max-h-8 max-w-[80px] object-contain" /> : <span className="text-[11px] text-prime-muted">No logo</span>}
      </div>
    </div>
  );
}

export default function AdminContentListsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('faqs');
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminGetContent()
      .then((res) => {
        setSaved(res.content);
        setDraft(structuredClone(res.content));
      })
      .catch((err) => setError(err.message));
  }, []);

  const dirty = saved != null && JSON.stringify(saved) !== JSON.stringify(draft);
  const items = draft?.[tab] || [];
  const setItems = (next) => setDraft((d) => ({ ...d, [tab]: next }));

  async function onSave() {
    setSaving(true);
    setError('');
    try {
      const res = await api.adminSaveContent(draft);
      setSaved(res.content);
      setDraft(structuredClone(res.content));
      toast.success('Saved. Empty items were removed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const [helpTitle, helpText, helpLink] = HELP[tab];

  return (
    <div>
      <AdminPageHeader title="FAQs & lists" lede="Short lists that appear on guest pages — questions, homepage trust points and partner logos." />
      {error ? <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Tabs tabs={TABS.map(([id, label]) => [id, `${label}${draft ? ` (${(draft[id] || []).length})` : ''}`])} value={tab} onChange={setTab} />
      {!draft ? (
        <p className="text-sm text-prime-muted">Loading…</p>
      ) : (
        <Card
          title={helpTitle}
          description={helpText}
          actions={
            <div className="flex items-center gap-3">
              <a href={helpLink} target="_blank" rel="noreferrer" className="prime-link text-xs">
                Open page
              </a>
              <button type="button" className="prime-btn-outline" onClick={() => setItems([...items, { ...BLANK[tab] }])}>
                <Plus size={14} /> Add
              </button>
            </div>
          }
        >
          {items.length ? (
            <ol className="space-y-3">
              {items.map((item, i) => (
                <li key={i} className="flex gap-3 border border-prime-line bg-prime-sand/40 p-4">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold tabular-nums text-prime-muted">{String(i + 1).padStart(2, '0')}</span>
                    <MoveButtons
                      disableUp={i === 0}
                      disableDown={i === items.length - 1}
                      onUp={() => setItems(reorderList(items, i, i - 1))}
                      onDown={() => setItems(reorderList(items, i, i + 1))}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <ItemEditor kind={tab} item={item} onChange={(next) => setItems(items.map((x, j) => (j === i ? next : x)))} />
                  </div>
                  <button
                    type="button"
                    className="grid h-9 w-9 shrink-0 place-items-center text-red-600"
                    aria-label="Remove"
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-prime-muted">Nothing here yet.</p>
          )}
        </Card>
      )}
      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={() => setDraft(structuredClone(saved))} />
    </div>
  );
}
