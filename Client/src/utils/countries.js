const ISO_CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
  'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
  'UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

/** Shown first in pickers — Prime's main guest markets */
const PRIORITY = ['EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'GB', 'US', 'DE'];

const cache = new Map();

export function countryName(code, localeTag = 'en-US') {
  if (!code) return '';
  try {
    const names = new Intl.DisplayNames([localeTag], { type: 'region' });
    return names.of(String(code).toUpperCase()) || code;
  } catch {
    return code;
  }
}

/** [{ code, name }] sorted by name in the active locale, with priority markets on top */
export function countryOptions(localeTag = 'en-US') {
  if (cache.has(localeTag)) return cache.get(localeTag);
  let names;
  try {
    names = new Intl.DisplayNames([localeTag], { type: 'region' });
  } catch {
    names = null;
  }
  const all = ISO_CODES.map((code) => ({ code, name: names?.of(code) || code }));
  const collator = new Intl.Collator(localeTag);
  const rest = all
    .filter((c) => !PRIORITY.includes(c.code))
    .sort((a, b) => collator.compare(a.name, b.name));
  const top = PRIORITY.map((code) => all.find((c) => c.code === code)).filter(Boolean);
  const result = { top, rest };
  cache.set(localeTag, result);
  return result;
}

export function isCountryCode(code) {
  return ISO_CODES.includes(String(code || '').toUpperCase());
}

/** Region subtag of the browser language (e.g. "ar-EG" → "EG") — fallback when IP lookup fails */
export function browserCountry() {
  const langs = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
  for (const lang of langs) {
    const region = String(lang || '').split('-')[1];
    if (region && isCountryCode(region)) return region.toUpperCase();
  }
  return '';
}
