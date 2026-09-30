/**
 * Booker country from IP — auto-fills Reservation Country / Nationality in the booking engine.
 * Order: CDN/edge country headers → IP lookup (ipapi.co) → unknown.
 */

const COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
  'x-appengine-country',
  'x-country-code',
];

const cache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function isPrivateIp(ip) {
  const v = String(ip || '').replace(/^::ffff:/, '');
  return (
    !v ||
    v === '::1' ||
    v.startsWith('127.') ||
    v.startsWith('10.') ||
    v.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(v) ||
    v.startsWith('fc') ||
    v.startsWith('fd') ||
    v.startsWith('fe80')
  );
}

function fromHeaders(req) {
  for (const name of COUNTRY_HEADERS) {
    const raw = String(req.headers[name] || '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(raw) && raw !== 'XX' && raw !== 'T1') return raw;
  }
  return null;
}

async function lookup(ip) {
  const key = ip || 'self';
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.country;

  const url = ip ? `https://ipapi.co/${encodeURIComponent(ip)}/country/` : 'https://ipapi.co/country/';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'prime-hospitality-booking/1.0' },
    });
    const text = (await res.text()).trim().toUpperCase();
    const country = res.ok && /^[A-Z]{2}$/.test(text) ? text : null;
    cache.set(key, { country, at: Date.now() });
    return country;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function detectCountry(req) {
  const header = fromHeaders(req);
  if (header) return { country: header, source: 'edge-header' };

  const ip = String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
  if (!isPrivateIp(ip)) {
    const country = await lookup(ip);
    return { country, source: country ? 'ip-lookup' : 'unknown' };
  }

  // Local dev: the server shares the booker's public IP, so look up our own egress IP.
  if (process.env.NODE_ENV !== 'production') {
    const country = await lookup(null);
    return { country, source: country ? 'ip-lookup-self' : 'unknown' };
  }
  return { country: null, source: 'unknown' };
}

module.exports = { detectCountry };
