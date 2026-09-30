import { defaultCopy } from '../../context/LocaleContext';
import { BilingualField } from './kit';

/** "home.heroLine1" → "Hero line 1" */
export function keyLabel(key) {
  const words = (key.split('.').slice(1).join(' ') || key).replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Set or clear one override key in a copy draft ({ en: {}, ar: {} }) */
export function setCopyValue(copy, key, value) {
  const next = { en: { ...(copy?.en || {}) }, ar: { ...(copy?.ar || {}) } };
  for (const locale of ['en', 'ar']) {
    const v = value?.[locale] ?? '';
    if (v.trim()) next[locale][key] = v;
    else delete next[locale][key];
  }
  return next;
}

export function isOverridden(copy, key) {
  return Boolean(copy?.en?.[key] || copy?.ar?.[key]);
}

/** Bilingual editors for a list of text keys; placeholders show the built-in wording */
export default function CopyFields({ keys, copy, onChange, labels = {} }) {
  return (
    <div className="space-y-5">
      {keys.map((key) => {
        const en = defaultCopy.en[key] || '';
        const ar = defaultCopy.ar[key] || '';
        return (
          <BilingualField
            key={key}
            label={
              <>
                {labels[key] || keyLabel(key)}
                {isOverridden(copy, key) ? <span className="ms-2 normal-case tracking-normal text-prime-gold-deep">· edited</span> : null}
              </>
            }
            multiline={en.length > 80}
            rows={en.length > 160 ? 4 : 2}
            value={{ en: copy?.en?.[key] || '', ar: copy?.ar?.[key] || '' }}
            placeholder={{ en, ar }}
            onChange={(value) => onChange(setCopyValue(copy, key, value))}
          />
        );
      })}
    </div>
  );
}
