import { useMemo, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { AdminPageHeader, ImageUploadField, MoveButtons, reorderList } from '../../components/admin/AdminUi';
import { BilingualField, Card, Field, SaveBar, SearchInput, Tabs, Toggle, labelCls, useSiteSection, useToast } from '../../components/admin/kit';
import CopyFields, { isOverridden } from '../../components/admin/CopyFields';
import { defaultCopy } from '../../context/LocaleContext';
import { useSite } from '../../context/SiteContext';
import { cn } from '../../utils/cn';

const GROUPS = [
  ['home', 'Homepage', '/'],
  ['nav', 'Header & menu', '/'],
  ['footer', 'Footer', '/'],
  ['about', 'About', '/about'],
  ['contact', 'Contact', '/contact'],
  ['faq', 'FAQ', '/faq'],
  ['owners', 'List your property', '/owners'],
  ['careers', 'Careers', '/careers'],
  ['legal', 'Legal pages', '/terms'],
  ['listing', 'Unit page', '/search'],
  ['bm', 'Booking popup', '/search'],
  ['booking', 'Checkout', '/search'],
  ['bs', 'Booking confirmation', '/'],
  ['common', 'Shared labels', '/'],
];

const ALL_KEYS = Object.keys(defaultCopy.en);

function TextEditor({ copy, onChange }) {
  const [group, setGroup] = useState('home');
  const [query, setQuery] = useState('');
  const [editedOnly, setEditedOnly] = useState(false);

  const groups = useMemo(() => {
    const known = new Set(GROUPS.map(([id]) => id));
    const extra = [...new Set(ALL_KEYS.map((k) => k.split('.')[0]))].filter((p) => !known.has(p)).map((p) => [p, p, '/']);
    return [...GROUPS, ...extra].map(([id, label, path]) => {
      const keys = ALL_KEYS.filter((k) => k.startsWith(`${id}.`));
      return { id, label, path, keys, edited: keys.filter((k) => isOverridden(copy, k)).length };
    });
  }, [copy]);

  const q = query.trim().toLowerCase();
  const keys = useMemo(() => {
    const pool = q ? ALL_KEYS : groups.find((g) => g.id === group)?.keys || [];
    return pool.filter((k) => {
      if (editedOnly && !isOverridden(copy, k)) return false;
      if (!q) return true;
      return [k, defaultCopy.en[k], defaultCopy.ar[k], copy?.en?.[k], copy?.ar?.[k]].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [q, group, groups, editedOnly, copy]);

  const current = groups.find((g) => g.id === group);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="h-fit border border-prime-line bg-prime-surface lg:sticky lg:top-20">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              setGroup(g.id);
              setQuery('');
            }}
            className={cn(
              'flex w-full items-center justify-between gap-2 border-b border-prime-line px-3 py-2.5 text-start text-sm last:border-b-0',
              group === g.id && !q ? 'bg-prime-night text-prime-sand' : 'hover:bg-prime-mist'
            )}
          >
            <span className="truncate">{g.label}</span>
            <span className="shrink-0 text-[10px] tabular-nums opacity-70">
              {g.edited ? `${g.edited}/` : ''}
              {g.keys.length}
            </span>
          </button>
        ))}
      </nav>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search any text on the site…" className="min-w-[240px] flex-1" />
          <Toggle checked={editedOnly} onChange={setEditedOnly} label="Edited only" />
          {!q && current ? (
            <a href={current.path} target="_blank" rel="noreferrer" className="prime-link inline-flex items-center gap-1 text-xs">
              Open page <ExternalLink size={12} />
            </a>
          ) : null}
        </div>
        <Card
          title={q ? `Results for “${query.trim()}”` : current?.label}
          description="Type in English and/or Arabic. Empty fields use the built-in wording shown in grey. Words in {braces} are filled in automatically — keep them."
        >
          {keys.length ? (
            <CopyFields keys={keys.slice(0, 200)} copy={copy} onChange={onChange} labels={q ? Object.fromEntries(keys.map((k) => [k, k])) : {}} />
          ) : (
            <p className="text-sm text-prime-muted">Nothing matches.</p>
          )}
          {keys.length > 200 ? <p className="mt-4 text-xs text-prime-muted">Showing the first 200 — refine the search.</p> : null}
        </Card>
      </div>
    </div>
  );
}

function PageImages({ title, description, fields, value, onChange, link }) {
  return (
    <Card
      title={title}
      description={description}
      actions={
        link ? (
          <a href={link} target="_blank" rel="noreferrer" className="prime-link inline-flex items-center gap-1 text-xs">
            Open page <ExternalLink size={12} />
          </a>
        ) : null
      }
    >
      <div className="space-y-5">
        {fields.map(([key, label, ratio]) => (
          <ImageUploadField
            key={key}
            label={label}
            value={value?.[key] || ''}
            folder="site"
            ratio={ratio}
            onChange={(url) => onChange({ ...value, [key]: url })}
          />
        ))}
        <p className="text-xs text-prime-muted">Empty = the built-in photo. Page text is edited under the “All text” tab.</p>
      </div>
    </Card>
  );
}

function CareersEditor({ value, onChange }) {
  const roles = value?.roles || [];
  const setRoles = (next) => onChange({ ...value, roles: next });
  return (
    <div className="space-y-6">
      <PageImages
        title="Careers page photo"
        fields={[['heroImage', 'Hero photo', '16:9 or wider']]}
        value={value}
        onChange={(v) => onChange({ ...value, ...v })}
        link="/careers"
      />
      <Card
        title="Open roles"
        description="Each role links guests to the contact page."
        actions={
          <button type="button" className="prime-btn-outline" onClick={() => setRoles([...roles, { title: '', location: '', type: 'Full-time' }])}>
            <Plus size={14} /> Add role
          </button>
        }
      >
        {roles.length ? (
          <ol className="space-y-3">
            {roles.map((r, i) => (
              <li key={i} className="grid items-end gap-3 border border-prime-line p-3 sm:grid-cols-[auto_2fr_1.3fr_1fr_auto]">
                <MoveButtons
                  disableUp={i === 0}
                  disableDown={i === roles.length - 1}
                  onUp={() => setRoles(reorderList(roles, i, i - 1))}
                  onDown={() => setRoles(reorderList(roles, i, i + 1))}
                />
                {[
                  ['title', 'Role'],
                  ['location', 'Location'],
                  ['type', 'Type'],
                ].map(([k, label]) => (
                  <Field key={k} label={label}>
                    <input
                      className="prime-input"
                      value={r[k] || ''}
                      onChange={(e) => setRoles(roles.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                    />
                  </Field>
                ))}
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center text-red-600"
                  aria-label="Remove role"
                  onClick={() => setRoles(roles.filter((_, j) => j !== i))}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-prime-muted">No open roles — the page will say so.</p>
        )}
      </Card>
    </div>
  );
}

const LEGAL = [
  ['terms', 'Terms & Conditions', '/terms'],
  ['privacy', 'Privacy Policy', '/privacy'],
  ['refund', 'Refund Policy', '/refund-policy'],
];

function LegalEditor({ value, onChange }) {
  const [which, setWhich] = useState('terms');
  const page = value?.[which] || {};
  const set = (patch) => onChange({ ...value, [which]: { ...page, ...patch } });
  const current = LEGAL.find(([id]) => id === which);
  return (
    <Card
      title={current[1]}
      description="Plain text. Leave a blank line between paragraphs, start a line with “## ” for a heading and “- ” for a bullet."
      actions={
        <div className="flex flex-wrap gap-1.5">
          {LEGAL.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setWhich(id)}
              className={cn(
                'border px-3 py-1.5 text-[11px] font-semibold',
                which === id ? 'border-prime-night bg-prime-night text-prime-sand' : 'border-prime-line'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Last updated" className="w-48">
            <input type="date" className="prime-input" value={page.updatedAt || ''} onChange={(e) => set({ updatedAt: e.target.value })} />
          </Field>
          <a href={current[2]} target="_blank" rel="noreferrer" className="prime-link inline-flex items-center gap-1 pb-3 text-xs">
            Open page <ExternalLink size={12} />
          </a>
        </div>
        <BilingualField
          label="Policy text"
          multiline
          rows={18}
          value={{ en: page.en || '', ar: page.ar || '' }}
          onChange={(v) => set(v)}
          placeholder={{ en: '## Bookings\n\nAll reservations…', ar: '## الحجوزات\n\nجميع الحجوزات…' }}
        />
      </div>
    </Card>
  );
}

const TABS = [
  ['text', 'All text'],
  ['about', 'About'],
  ['owners', 'List your property'],
  ['careers', 'Careers'],
  ['legal', 'Legal pages'],
];

export default function AdminPagesPage() {
  const toast = useToast();
  const { replace } = useSite();
  const { draft, setDraft, dirty, saving, error, save, discard, loaded } = useSiteSection(api, ['copy', 'pages'], replace);
  const [tab, setTab] = useState('text');

  const setPages = (key, value) => setDraft((d) => ({ ...d, pages: { ...d.pages, [key]: value } }));

  async function onSave() {
    if (await save()) toast.success('Pages saved — live on the website.');
  }

  return (
    <div>
      <AdminPageHeader
        title="Pages & text"
        lede="Edit every guest-facing word in English and Arabic, page photos, open roles and legal policies."
      />
      {error ? <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {!loaded ? (
        <p className="text-sm text-prime-muted">Loading…</p>
      ) : (
        <>
          {tab === 'text' && <TextEditor copy={draft.copy} onChange={(copy) => setDraft((d) => ({ ...d, copy }))} />}
          {tab === 'about' && (
            <PageImages
              title="About page photos"
              link="/about"
              fields={[
                ['heroImage', 'Hero photo', '16:9 or wider'],
                ['wideImage', 'Wide photo', '21:9'],
                ['portraitImage', 'Portrait photo', '4:5'],
              ]}
              value={draft.pages.about}
              onChange={(v) => setPages('about', v)}
            />
          )}
          {tab === 'owners' && (
            <PageImages
              title="List-your-property page photos"
              link="/owners"
              fields={[
                ['heroImage', 'Hero photo', '16:9 or wider'],
                ['sideImage', 'Inquiry form photo', '4:5'],
              ]}
              value={draft.pages.owners}
              onChange={(v) => setPages('owners', v)}
            />
          )}
          {tab === 'careers' && <CareersEditor value={draft.pages.careers} onChange={(v) => setPages('careers', v)} />}
          {tab === 'legal' && <LegalEditor value={draft.pages.legal} onChange={(v) => setPages('legal', v)} />}
        </>
      )}
      <p className={cn(labelCls, 'mt-6 normal-case tracking-normal')}>
        Rates, availability and reservations are managed in Kwentra — this page only changes website content.
      </p>
      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={discard} />
    </div>
  );
}
