import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import api from '../../api/client';
import { AdminPageHeader, ImageUploadField } from '../../components/admin/AdminUi';
import { Badge, BilingualField, Card, Field, SaveBar, Tabs, Toggle, useSiteSection, useToast } from '../../components/admin/kit';
import { SEO_DEFAULT_TITLES, SEO_ROUTES } from '../../components/SeoManager';
import { activeAnnouncement, useSite } from '../../context/SiteContext';
import { brand } from '../../theme/brand';
import { cn } from '../../utils/cn';

const TABS = [
  ['announcement', 'Announcement bar'],
  ['seo', 'SEO & sharing'],
  ['tracking', 'Tracking pixels'],
  ['campaigns', 'Campaign links'],
];

const TONES = [
  ['night', 'Charcoal', 'bg-[#221f20] text-white'],
  ['gold', 'Gold', 'bg-prime-gold text-[#221f20]'],
  ['sand', 'Sand', 'bg-prime-mist text-prime-ink border border-prime-line'],
];

const PAGE_PATHS = Object.fromEntries(Object.entries(SEO_ROUTES).map(([path, key]) => [key, path]));
const siteOrigin = () => (brand.domain || window.location.origin).replace(/\/$/, '');

function AnnouncementTab({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const today = new Date().toISOString().slice(0, 10);
  const live = activeAnnouncement(value, 'en', today);
  const tone = TONES.find(([id]) => id === value.tone) || TONES[0];
  let status = ['gray', 'Off'];
  if (value.enabled && !value.text?.en && !value.text?.ar) status = ['red', 'Add a message'];
  else if (value.enabled && value.startsAt && today < value.startsAt) status = ['blue', `Scheduled from ${value.startsAt}`];
  else if (value.enabled && value.endsAt && today > value.endsAt) status = ['gray', 'Ended'];
  else if (live) status = ['green', 'Live now'];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card title="Announcement bar" description="A thin bar above the header on every guest page — offers, seasonal news, openings. Guests can dismiss it." actions={<Badge tone={status[0]}>{status[1]}</Badge>}>
        <div className="space-y-5">
          <Toggle checked={value.enabled} onChange={(enabled) => set({ enabled })} label="Show the announcement bar" />
          <BilingualField label="Message" value={value.text} onChange={(text) => set({ text })} placeholder={{ en: 'Summer on the North Coast — book direct for the best rate', ar: 'صيف الساحل الشمالي — احجز مباشرة بأفضل سعر' }} />
          <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
            <BilingualField label="Link text" value={value.linkLabel} onChange={(linkLabel) => set({ linkLabel })} placeholder={{ en: 'Explore', ar: 'استكشف' }} />
            <Field label="Link" hint="A page on this site (/search?destination=north-coast) or a full https:// link.">
              <input className="prime-input" value={value.href || ''} placeholder="/search" onChange={(e) => set({ href: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Starts" hint="Optional">
              <input type="date" className="prime-input" value={value.startsAt || ''} onChange={(e) => set({ startsAt: e.target.value })} />
            </Field>
            <Field label="Ends" hint="Optional">
              <input type="date" className="prime-input" value={value.endsAt || ''} onChange={(e) => set({ endsAt: e.target.value })} />
            </Field>
            <Field label="Colour">
              <select className="prime-input" value={value.tone} onChange={(e) => set({ tone: e.target.value })}>
                {TONES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Card>
      <Card title="Preview" className="h-fit">
        <div className={cn('px-3 py-2.5 text-center text-[11.5px] tracking-[0.06em]', tone[2])}>
          {value.text?.en || 'Your message'}
          {value.linkLabel?.en ? <span className="ms-2 underline underline-offset-4">{value.linkLabel.en}</span> : null}
        </div>
        {value.text?.ar ? (
          <div dir="rtl" className={cn('mt-2 px-3 py-2.5 text-center text-[11.5px]', tone[2])}>
            {value.text.ar}
            {value.linkLabel?.ar ? <span className="ms-2 underline underline-offset-4">{value.linkLabel.ar}</span> : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Counter({ value, max }) {
  const n = String(value || '').length;
  return <span className={cn('tabular-nums', n > max ? 'text-red-600' : 'text-prime-muted')}>{n}/{max}</span>;
}

function SeoTab({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const setPage = (key, patch) => set({ pages: { ...value.pages, [key]: { ...(value.pages?.[key] || {}), ...patch } } });
  const suffix = value.titleSuffix || brand.name;

  return (
    <div className="space-y-6">
      <Card title="Site-wide" description="Used on every page unless a page below overrides it. Unit pages use the unit’s own title, description and first photo automatically.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title suffix" hint={`Added after every page title, e.g. “Find a stay · ${suffix}”.`}>
            <input className="prime-input" value={value.titleSuffix || ''} placeholder={brand.name} onChange={(e) => set({ titleSuffix: e.target.value })} />
          </Field>
          <Field label={<>Default description <Counter value={value.defaultDescription} max={160} /></>} hint="Shown in Google results and link previews.">
            <textarea className="prime-input min-h-[70px]" value={value.defaultDescription || ''} onChange={(e) => set({ defaultDescription: e.target.value })} />
          </Field>
        </div>
        <ImageUploadField
          className="mt-5"
          label="Default share image (WhatsApp, Facebook, LinkedIn previews)"
          value={value.ogImage || ''}
          folder="site"
          ratio="1.91:1"
          size="1200×630"
          onChange={(ogImage) => set({ ogImage })}
        />
      </Card>

      <Card title="Pages" description="Leave empty to use the default title shown in grey.">
        <div className="divide-y divide-prime-line">
          {Object.keys(SEO_DEFAULT_TITLES).map((key) => {
            const page = value.pages?.[key] || {};
            const title = `${page.title || SEO_DEFAULT_TITLES[key]} · ${suffix}`;
            return (
              <div key={key} className="grid gap-4 py-5 first:pt-0 lg:grid-cols-[1fr_1fr_1fr]">
                <Field label={<>{SEO_DEFAULT_TITLES[key]} title <Counter value={page.title} max={60} /></>}>
                  <input className="prime-input" value={page.title || ''} placeholder={SEO_DEFAULT_TITLES[key]} onChange={(e) => setPage(key, { title: e.target.value })} />
                </Field>
                <Field label={<>Description <Counter value={page.description} max={160} /></>}>
                  <textarea
                    className="prime-input min-h-[44px]"
                    rows={2}
                    value={page.description || ''}
                    placeholder={value.defaultDescription || ''}
                    onChange={(e) => setPage(key, { description: e.target.value })}
                  />
                </Field>
                <div className="min-w-0 border border-prime-line bg-white p-3 text-[13px] leading-snug">
                  <p className="truncate text-[11px] text-emerald-800">{siteOrigin()}{PAGE_PATHS[key]}</p>
                  <p className="truncate text-[15px] text-[#1a0dab]">{title}</p>
                  <p className="line-clamp-2 text-[#4d5156]">{page.description || value.defaultDescription || 'No description yet.'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

const PIXEL_FIELDS = [
  ['metaPixelId', 'Meta (Facebook / Instagram) Pixel ID', '1234567890', /^\d*$/],
  ['googleAdsId', 'Google Ads ID', 'AW-XXXXXXXXX', /^(AW-[A-Z0-9-]+)?$/i],
  ['gtmId', 'Google Tag Manager ID', 'GTM-XXXXXXX', /^(GTM-[A-Z0-9]+)?$/i],
];

function TrackingTab({ pixels, onPixels, tracking, onTracking }) {
  const ga4Ok = !tracking.ga4Id || /^G-[A-Z0-9]{4,20}$/i.test(tracking.ga4Id);
  return (
    <Card title="Tracking" description="IDs only — the website adds the official scripts. Nothing loads on the admin pages.">
      <div className="grid gap-5 sm:grid-cols-2">
        {PIXEL_FIELDS.map(([key, label, placeholder, re]) => {
          const ok = re.test(pixels[key] || '');
          return (
            <Field key={key} label={label} hint={ok ? (pixels[key] ? 'Active on the website' : 'Not set') : 'This doesn’t look like a valid ID'}>
              <input
                className={cn('prime-input', !ok && 'border-red-300')}
                value={pixels[key] || ''}
                placeholder={placeholder}
                onChange={(e) => onPixels({ ...pixels, [key]: e.target.value.trim() })}
              />
            </Field>
          );
        })}
        <Field label="Google Analytics 4 measurement ID" hint={ga4Ok ? (tracking.ga4Id ? 'Active on the website' : 'Not set') : 'Should look like G-XXXXXXXXXX'}>
          <input
            className={cn('prime-input', !ga4Ok && 'border-red-300')}
            value={tracking.ga4Id || ''}
            placeholder="G-XXXXXXXXXX"
            onChange={(e) => onTracking({ ...tracking, ga4Id: e.target.value.trim() })}
          />
        </Field>
      </div>
    </Card>
  );
}

function CampaignsTab() {
  const [units, setUnits] = useState([]);
  const [target, setTarget] = useState('/');
  const [utm, setUtm] = useState({ source: 'instagram', medium: 'social', campaign: '', content: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.adminGetUnits().then((res) => setUnits((res.items || []).filter((u) => u.published !== false))).catch(() => {});
  }, []);

  const url = useMemo(() => {
    const u = new URL(target, `${siteOrigin()}/`);
    Object.entries(utm).forEach(([k, v]) => v.trim() && u.searchParams.set(`utm_${k}`, v.trim().toLowerCase().replace(/\s+/g, '-')));
    return u.toString();
  }, [target, utm]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card title="Campaign link builder" description="Build tagged links for ads, Instagram bios, WhatsApp broadcasts and emails, so visits show up by campaign in Google Analytics / Meta.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Page" className="sm:col-span-2">
          <select className="prime-input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <optgroup label="Pages">
              {Object.entries(SEO_DEFAULT_TITLES).map(([key, label]) => (
                <option key={key} value={PAGE_PATHS[key]}>
                  {label} ({PAGE_PATHS[key]})
                </option>
              ))}
            </optgroup>
            <optgroup label="Unit types">
              {units.map((u) => (
                <option key={u.id} value={`/listings/${u.slug}`}>
                  {[u.compound, u.title].filter(Boolean).join(' — ')}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        {[
          ['source', 'Source', 'instagram, facebook, google, whatsapp, newsletter'],
          ['medium', 'Medium', 'social, cpc, email, referral'],
          ['campaign', 'Campaign', 'summer-2026'],
          ['content', 'Content (optional)', 'story-1, carousel-b'],
        ].map(([key, label, hint]) => (
          <Field key={key} label={label} hint={hint}>
            <input className="prime-input" value={utm[key]} onChange={(e) => setUtm((s) => ({ ...s, [key]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border border-prime-line bg-prime-mist p-3">
        <code className="min-w-0 flex-1 break-all text-xs">{url}</code>
        <button type="button" className="prime-btn" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </Card>
  );
}

export default function AdminMarketingPage() {
  const toast = useToast();
  const { replace } = useSite();
  const site = useSiteSection(api, ['announcement', 'seo', 'tracking'], replace);
  const [tab, setTab] = useState('announcement');
  const [pixels, setPixels] = useState(null);
  const [pixelsSaved, setPixelsSaved] = useState(null);
  const [savingPixels, setSavingPixels] = useState(false);

  useEffect(() => {
    api
      .adminGetSettings()
      .then((res) => {
        setPixels(res.settings || {});
        setPixelsSaved(res.settings || {});
      })
      .catch(() => {});
  }, []);

  const pixelsDirty = pixelsSaved != null && JSON.stringify(pixels) !== JSON.stringify(pixelsSaved);
  const set = (key) => (value) => site.setDraft((d) => ({ ...d, [key]: value }));

  async function onSave() {
    let ok = true;
    if (site.dirty) ok = await site.save();
    if (ok && pixelsDirty) {
      setSavingPixels(true);
      try {
        const res = await api.adminSaveSettings(pixels);
        setPixels(res.settings);
        setPixelsSaved(res.settings);
      } catch (err) {
        ok = false;
        toast.error(err.message);
      } finally {
        setSavingPixels(false);
      }
    }
    if (ok) toast.success('Marketing settings saved.');
  }

  function onDiscard() {
    site.discard();
    setPixels(pixelsSaved);
  }

  return (
    <div>
      <AdminPageHeader title="Marketing" lede="Promote the website without touching the PMS: announcements, search & social previews, tracking and campaign links." />
      {site.error ? <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{site.error}</p> : null}
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {!site.loaded ? (
        <p className="text-sm text-prime-muted">Loading…</p>
      ) : (
        <>
          {tab === 'announcement' && <AnnouncementTab value={site.draft.announcement} onChange={set('announcement')} />}
          {tab === 'seo' && <SeoTab value={site.draft.seo} onChange={set('seo')} />}
          {tab === 'tracking' && pixels ? (
            <TrackingTab pixels={pixels} onPixels={setPixels} tracking={site.draft.tracking} onTracking={set('tracking')} />
          ) : null}
          {tab === 'campaigns' && <CampaignsTab />}
        </>
      )}
      <SaveBar dirty={site.dirty || pixelsDirty} saving={site.saving || savingPixels} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
