import { useEffect, useState } from 'react';
import api from '../../api/client';
import { AdminPageHeader } from '../../components/admin/AdminUi';

export default function AdminMarketingPage() {
  const [settings, setSettings] = useState({
    metaPixelId: '',
    facebookPixelId: '',
    googleAdsId: '',
    gtmId: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .adminGetSettings()
      .then((data) => setSettings({ ...settings, ...(data.settings || {}) }))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await api.adminSaveSettings(settings);
      setSettings(data.settings);
      setMessage('Marketing settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    {
      key: 'metaPixelId',
      label: 'Meta Pixel ID',
      hint: 'Primary Meta / Facebook Ads pixel (numbers only, e.g. 1234567890)',
    },
    {
      key: 'facebookPixelId',
      label: 'Facebook Pixel ID (optional alias)',
      hint: 'If empty, Meta Pixel ID is used on the guest site',
    },
    {
      key: 'googleAdsId',
      label: 'Google Ads ID',
      hint: 'Optional — e.g. AW-XXXXXXXXX',
    },
    {
      key: 'gtmId',
      label: 'Google Tag Manager ID',
      hint: 'Optional — e.g. GTM-XXXXXXX',
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Marketing pixels"
        lede="Inject Meta / Facebook Ads and optional Google tags on the public site."
      />
      <form onSubmit={save} className="max-w-xl space-y-5 border border-prime-line bg-prime-surface p-5 sm:p-6">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-muted">
              {f.label}
            </span>
            <input
              className="prime-input"
              value={settings[f.key] || ''}
              onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.value }))}
              placeholder={f.hint}
            />
            <p className="mt-1 text-[11px] text-prime-muted">{f.hint}</p>
          </label>
        ))}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <button type="submit" className="prime-btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
