import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import api from '../../api/client';
import { AdminPageHeader, MoveButtons, reorderList } from '../../components/admin/AdminUi';
import { Badge, Card, SaveBar, useSiteSection, useToast } from '../../components/admin/kit';
import CopyFields, { isOverridden } from '../../components/admin/CopyFields';
import { useSite } from '../../context/SiteContext';
import { cn } from '../../utils/cn';

const HERO_KEYS = ['home.heroLine1', 'home.heroLine2', 'home.heroSubtitle', 'home.introEyebrow'];

const SECTION_INFO = {
  intro: {
    name: 'Introduction',
    about: 'Brand statement with live destination/property counts.',
    keys: ['home.introTitle', 'home.introBody', 'home.ourStory'],
  },
  properties: {
    name: 'Destinations',
    about: 'Destination tiles — choose which appear under Inventory › Destinations (“Show on home”).',
    keys: ['home.destinations', 'home.destinationsBody', 'home.exploreCompounds'],
    link: ['/admin/destinations', 'Manage destinations'],
  },
  brands: {
    name: 'Brands',
    about: 'Prime Inn, Residence and Select.',
    keys: ['home.brandsEyebrow', 'home.brandsTitle'],
  },
  featured: {
    name: 'Featured stays',
    about: 'Carousel of unit types marked “Featured”.',
    keys: ['home.featured', 'home.featuredTitle', 'home.viewAll'],
    link: ['/admin/units', 'Choose featured units'],
  },
  trust: {
    name: 'Why Prime',
    about: 'Numbered trust points.',
    keys: ['home.why', 'home.trustTitle', 'home.trustBody'],
    link: ['/admin/content', 'Edit trust points'],
  },
  partners: {
    name: 'Partner logos',
    about: 'Channel / partner logo strip.',
    keys: ['home.partners'],
    link: ['/admin/content', 'Edit partners'],
  },
  partnerCta: {
    name: 'Owner call-to-action',
    about: 'Invites property owners to list with Prime.',
    keys: ['home.partnersLabel', 'home.partnerCtaTitle', 'home.partnerCtaBody', 'home.partnerCtaBtn'],
  },
};

export default function AdminHomepagePage() {
  const toast = useToast();
  const { replace } = useSite();
  const { draft, setDraft, dirty, saving, error, save, discard, loaded } = useSiteSection(api, ['home', 'copy'], replace);
  const [open, setOpen] = useState('');

  const sections = draft?.home?.sections || [];

  function setSections(next) {
    setDraft((d) => ({ ...d, home: { ...d.home, sections: next } }));
  }

  function setCopy(copy) {
    setDraft((d) => ({ ...d, copy }));
  }

  async function onSave() {
    if (await save()) toast.success('Homepage saved — refresh the site to see it.');
  }

  return (
    <div>
      <AdminPageHeader
        title="Homepage"
        lede="Arrange the homepage like a theme editor: reorder sections, hide what you don’t need, and rewrite the text in English and Arabic."
        actions={
          <a href="/" target="_blank" rel="noreferrer" className="prime-btn-outline">
            Preview homepage
          </a>
        }
      />
      {error ? <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {!loaded ? (
        <p className="text-sm text-prime-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          <Card
            title="Hero"
            description="Full-screen photo slideshow with the search bar. Leave a field empty to keep the built-in wording shown in grey."
            actions={
              <Link to="/admin/slideshow" className="prime-link text-xs">
                Manage slideshow photos
              </Link>
            }
          >
            <CopyFields keys={HERO_KEYS} copy={draft.copy} onChange={setCopy} />
          </Card>

          <Card title="Sections" description="Top to bottom, below the hero.">
            <ol className="divide-y divide-prime-line border border-prime-line">
              {sections.map((s, index) => {
                const info = SECTION_INFO[s.id] || { name: s.id, keys: [] };
                const edited = info.keys.some((k) => isOverridden(draft.copy, k));
                const expanded = open === s.id;
                return (
                  <li key={s.id} className={cn('bg-prime-surface', !s.enabled && 'bg-prime-mist/60')}>
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <MoveButtons
                        disableUp={index === 0}
                        disableDown={index === sections.length - 1}
                        onUp={() => setSections(reorderList(sections, index, index - 1))}
                        onDown={() => setSections(reorderList(sections, index, index + 1))}
                      />
                      <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setOpen(expanded ? '' : s.id)}>
                        <p className={cn('font-semibold', !s.enabled && 'text-prime-muted line-through')}>{info.name}</p>
                        <p className="text-xs text-prime-muted">{info.about}</p>
                      </button>
                      {edited ? <Badge tone="gold">Text edited</Badge> : null}
                      <button
                        type="button"
                        onClick={() => setSections(sections.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)))}
                        className="inline-flex items-center gap-1.5 border border-prime-line px-2.5 py-1.5 text-[11px] font-semibold"
                        title={s.enabled ? 'Hide section' : 'Show section'}
                      >
                        {s.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        {s.enabled ? 'Visible' : 'Hidden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpen(expanded ? '' : s.id)}
                        className="grid h-8 w-8 place-items-center"
                        aria-label={expanded ? 'Collapse' : 'Edit text'}
                      >
                        <ChevronDown size={16} className={cn('transition', expanded && 'rotate-180')} />
                      </button>
                    </div>
                    {expanded ? (
                      <div className="border-t border-prime-line px-4 py-5">
                        {info.keys.length ? <CopyFields keys={info.keys} copy={draft.copy} onChange={setCopy} /> : null}
                        {info.link ? (
                          <Link to={info.link[0]} className="prime-link mt-5 text-xs">
                            {info.link[1]}
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      )}
      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={discard} />
    </div>
  );
}
