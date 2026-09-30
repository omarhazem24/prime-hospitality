import api from '../../api/client';
import { AdminPageHeader } from '../../components/admin/AdminUi';
import { Card, Field, SaveBar, useSiteSection, useToast } from '../../components/admin/kit';
import { useSite } from '../../context/SiteContext';
import { brand } from '../../theme/brand';

const CONTACT = [
  ['name', 'Business name', 'Prime Hospitality'],
  ['tagline', 'Tagline', 'Prime stays for Prime customers.'],
  ['email', 'Guest email', 'hello@primehospitality.com'],
  ['whatsapp', 'WhatsApp number (international)', '+201000000000'],
  ['phone', 'Phone number to dial', '+201000000000'],
  ['phoneDisplay', 'Phone as shown', '0100 000 0000'],
  ['address', 'Office address', 'New Cairo, Egypt'],
];

const SOCIAL = [
  ['instagram', 'Instagram', 'https://instagram.com/…'],
  ['facebook', 'Facebook', 'https://facebook.com/…'],
  ['tiktok', 'TikTok', 'https://tiktok.com/@…'],
  ['linkedin', 'LinkedIn', 'https://linkedin.com/company/…'],
];

export default function AdminBusinessPage() {
  const toast = useToast();
  const { replace } = useSite();
  const { draft, setDraft, dirty, saving, error, save, discard, loaded } = useSiteSection(api, 'business', replace);

  function set(key, value) {
    setDraft((d) => ({ ...d, business: { ...d.business, [key]: value } }));
  }

  async function onSave() {
    if (await save()) toast.success('Business info saved — live on the website.');
  }

  return (
    <div>
      <AdminPageHeader
        title="Business info"
        lede="Contact details and social links used in the header menu, footer, contact page and WhatsApp buttons. Leave a field empty to keep the built-in value."
      />
      {error ? <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {!loaded ? (
        <p className="text-sm text-prime-muted">Loading…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card title="Contact" description="Shown to guests on every page.">
              <div className="grid gap-4 sm:grid-cols-2">
                {CONTACT.map(([key, label, placeholder]) => (
                  <Field key={key} label={label} className={key === 'address' || key === 'tagline' ? 'sm:col-span-2' : ''}>
                    <input
                      className="prime-input"
                      value={draft.business[key] || ''}
                      placeholder={placeholder}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </Card>
            <Card title="Social links" description="Icons appear in the footer only for links you fill in.">
              <div className="grid gap-4 sm:grid-cols-2">
                {SOCIAL.map(([key, label, placeholder]) => (
                  <Field key={key} label={label}>
                    <input
                      type="url"
                      className="prime-input"
                      value={draft.business[key] || ''}
                      placeholder={placeholder}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </Card>
          </div>
          <Card title="Live on the site" className="h-fit">
            <dl className="space-y-3 text-sm">
              {[
                ['Name', brand.name],
                ['Email', brand.email],
                ['WhatsApp', brand.whatsapp],
                ['Phone', brand.phoneDisplay],
                ['Address', brand.address],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-prime-muted">{k}</dt>
                  <dd className="mt-0.5 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}
      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={discard} />
    </div>
  );
}
