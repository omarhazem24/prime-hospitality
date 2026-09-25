/**
 * Local JSON CMS (dev fallback when Supabase env vars are missing).
 */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { compounds: seedCompounds, listings: seedListings, propertyTypes, partners, trustPoints, faqs } =
  require('../data/mock');

const STORE_PATH = path.join(__dirname, '../../data/cms-store.json');

const DEFAULT_SLIDESHOW = [
  {
    id: 'slide-1',
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2200&q=85',
    alt: 'Prime stay interior',
    enabled: true,
    sortOrder: 0,
  },
  {
    id: 'slide-2',
    image:
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdbc?auto=format&fit=crop&w=2200&q=85',
    alt: 'Coastal villa',
    enabled: true,
    sortOrder: 1,
  },
  {
    id: 'slide-3',
    image:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2200&q=85',
    alt: 'Living space',
    enabled: true,
    sortOrder: 2,
  },
];

const bookingsMem = [];
const guestsMem = new Map();

function buildSeed() {
  const compounds = seedCompounds.map((c, i) => ({
    ...c,
    sortOrder: i,
    showOnHome: true,
    published: true,
  }));
  const units = seedListings.map((l, i) => ({
    ...l,
    published: l.available !== false,
    homeOrder: l.featured ? i : 1000 + i,
    searchOrder: i,
    driveFolderUrl: '',
  }));
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    slideshow: DEFAULT_SLIDESHOW,
    compounds,
    units,
    settings: {
      metaPixelId: '',
      facebookPixelId: '',
      googleAdsId: '',
      gtmId: '',
    },
    content: { propertyTypes, partners, trustPoints, faqs },
  };
}

function ensureStore() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(buildSeed(), null, 2), 'utf8');
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
}

function writeStore(data) {
  ensureStore();
  const next = { ...data, updatedAt: new Date().toISOString() };
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmp, STORE_PATH);
  return next;
}

function updateStore(mutator) {
  return writeStore(mutator(structuredClone(readStore())));
}

function sortBy(arr, key) {
  return [...arr].sort((a, b) => (Number(a[key]) || 0) - (Number(b[key]) || 0));
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function newId(prefix = 'id') {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function applyOrder(items, orderedIds, orderKey) {
  const map = new Map(items.map((item) => [item.id, item]));
  orderedIds.forEach((id, index) => {
    const item = map.get(id);
    if (item) item[orderKey] = index;
  });
  return items;
}

async function getDashboard() {
  const store = readStore();
  return {
    counts: {
      units: store.units.length,
      publishedUnits: store.units.filter((u) => u.published !== false).length,
      featuredUnits: store.units.filter((u) => u.featured).length,
      compounds: store.compounds.length,
      slides: store.slideshow.length,
    },
    updatedAt: store.updatedAt,
  };
}

async function getPublicUnits({ featuredOnly = false, publishedOnly = true } = {}) {
  const { units } = readStore();
  let list = units.filter((u) => (publishedOnly ? u.published !== false : true));
  if (featuredOnly) list = list.filter((u) => u.featured);
  return sortBy(list, featuredOnly ? 'homeOrder' : 'searchOrder');
}

async function getPublicCompounds({ homeOnly = false } = {}) {
  const { compounds } = readStore();
  let list = compounds.filter((c) => c.published !== false);
  if (homeOnly) list = list.filter((c) => c.showOnHome !== false);
  return sortBy(list, 'sortOrder');
}

async function getSlideshow() {
  const { slideshow } = readStore();
  return sortBy(
    (slideshow || []).filter((s) => s.enabled !== false),
    'sortOrder'
  );
}

async function getSettings() {
  return readStore().settings || {};
}

async function getContent() {
  return readStore().content || buildSeed().content;
}

async function findUnit(idOrSlug) {
  const { units } = readStore();
  return units.find((u) => u.id === idOrSlug || u.slug === idOrSlug) || null;
}

async function findCompound(id) {
  const { compounds } = readStore();
  return compounds.find((c) => c.id === id) || null;
}

async function listCompounds() {
  return sortBy(readStore().compounds || [], 'sortOrder');
}

async function listUnits() {
  return sortBy(readStore().units || [], 'searchOrder');
}

async function listSlides() {
  return sortBy(readStore().slideshow || [], 'sortOrder');
}

async function createSlide({ image, alt = '', enabled = true }) {
  const store = updateStore((s) => {
    s.slideshow.push({
      id: newId('slide'),
      image,
      alt,
      enabled: enabled !== false,
      sortOrder: (s.slideshow || []).length,
    });
    return s;
  });
  return store.slideshow[store.slideshow.length - 1];
}

async function updateSlide(id, patch) {
  let item = null;
  updateStore((s) => {
    const slide = (s.slideshow || []).find((x) => x.id === id);
    if (!slide) return s;
    Object.assign(slide, patch);
    item = slide;
    return s;
  });
  return item;
}

async function deleteSlide(id) {
  const store = updateStore((s) => {
    s.slideshow = (s.slideshow || []).filter((x) => x.id !== id);
    s.slideshow.forEach((x, i) => {
      x.sortOrder = i;
    });
    return s;
  });
  return sortBy(store.slideshow, 'sortOrder');
}

async function reorderSlides(ids) {
  const store = updateStore((s) => {
    s.slideshow = applyOrder(s.slideshow || [], ids, 'sortOrder');
    return s;
  });
  return sortBy(store.slideshow, 'sortOrder');
}

async function createCompound(body) {
  const id = body.id || slugify(body.name);
  if (await findCompound(id)) {
    const err = new Error('Compound id already exists');
    err.status = 409;
    throw err;
  }
  const store = updateStore((s) => {
    s.compounds.push({
      id,
      name: body.name,
      region: body.region || '',
      destinationId: body.destinationId || '',
      unitCount: Number(body.unitCount) || 0,
      image: body.image || '',
      sortOrder: s.compounds.length,
      showOnHome: body.showOnHome !== false,
      published: body.published !== false,
      kwentraProjectId: body.kwentraProjectId || '',
      kwentraDestinationId: body.kwentraDestinationId || '',
    });
    return s;
  });
  return store.compounds.find((c) => c.id === id);
}

async function updateCompound(id, body) {
  let item = null;
  updateStore((s) => {
    const found = (s.compounds || []).find((c) => c.id === id);
    if (!found) return s;
    const fields = [
      'name',
      'region',
      'destinationId',
      'image',
      'unitCount',
      'showOnHome',
      'published',
      'sortOrder',
      'kwentraProjectId',
      'kwentraDestinationId',
    ];
    for (const key of fields) {
      if (body?.[key] !== undefined) found[key] = body[key];
    }
    if (body?.unitCount !== undefined) found.unitCount = Number(body.unitCount) || 0;
    item = found;
    return s;
  });
  return item;
}

async function deleteCompound(id) {
  const store = updateStore((s) => {
    s.compounds = (s.compounds || []).filter((c) => c.id !== id);
    s.compounds.forEach((c, i) => {
      c.sortOrder = i;
    });
    return s;
  });
  return sortBy(store.compounds, 'sortOrder');
}

async function reorderCompounds(ids) {
  const store = updateStore((s) => {
    s.compounds = applyOrder(s.compounds || [], ids, 'sortOrder');
    return s;
  });
  return sortBy(store.compounds, 'sortOrder');
}

async function createUnit(body) {
  const slug = body.slug || slugify(body.title);
  if (await findUnit(slug)) {
    const err = new Error('Slug already exists');
    err.status = 409;
    throw err;
  }
  let created = null;
  updateStore((s) => {
    const compound = (s.compounds || []).find((c) => c.id === body.compoundId);
    const unit = {
      id: newId('unit'),
      slug,
      title: body.title,
      compoundId: body.compoundId || '',
      compound: body.compound || compound?.name || '',
      region: body.region || compound?.region || '',
      city: body.city || '',
      propertyType: body.propertyType || 'Apartment',
      bedrooms: Number(body.bedrooms) || 1,
      bathrooms: Number(body.bathrooms) || 1,
      areaSqm: Number(body.areaSqm) || 0,
      maxGuests: Number(body.maxGuests) || 2,
      pricePerNight: Number(body.pricePerNight) || 0,
      currency: body.currency || 'EGP',
      featured: Boolean(body.featured),
      available: body.available !== false,
      published: body.published !== false,
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      facilities: Array.isArray(body.facilities) ? body.facilities : [],
      description: body.description || '',
      images: Array.isArray(body.images) ? body.images : [],
      driveFolderUrl: body.driveFolderUrl || '',
      kwentraRoomTypeId: body.kwentraRoomTypeId || '',
      homeOrder: Number.isFinite(Number(body.homeOrder)) ? Number(body.homeOrder) : 999,
      searchOrder: s.units.length,
      averageRating: body.averageRating || 0,
      reviewCount: body.reviewCount || 0,
      reviews: Array.isArray(body.reviews) ? body.reviews : [],
    };
    s.units.push(unit);
    created = unit;
    return s;
  });
  return created;
}

async function updateUnit(idOrSlug, body) {
  let item = null;
  updateStore((s) => {
    const found = (s.units || []).find((u) => u.id === idOrSlug || u.slug === idOrSlug);
    if (!found) return s;
    const scalar = [
      'title',
      'slug',
      'compoundId',
      'compound',
      'region',
      'city',
      'propertyType',
      'currency',
      'description',
      'featured',
      'available',
      'published',
      'homeOrder',
      'searchOrder',
      'driveFolderUrl',
      'kwentraRoomTypeId',
    ];
    for (const key of scalar) {
      if (body[key] !== undefined) found[key] = body[key];
    }
    ['bedrooms', 'bathrooms', 'areaSqm', 'maxGuests', 'pricePerNight'].forEach((key) => {
      if (body[key] !== undefined) found[key] = Number(body[key]) || 0;
    });
    if (Array.isArray(body.amenities)) found.amenities = body.amenities;
    if (Array.isArray(body.facilities)) found.facilities = body.facilities;
    if (Array.isArray(body.images)) found.images = body.images;
    if (body.compoundId) {
      const compound = (s.compounds || []).find((c) => c.id === body.compoundId);
      if (compound && !body.compound) found.compound = compound.name;
      if (compound && !body.region) found.region = compound.region;
    }
    item = found;
    return s;
  });
  return item;
}

async function deleteUnit(idOrSlug) {
  const store = updateStore((s) => {
    s.units = (s.units || []).filter((u) => u.id !== idOrSlug && u.slug !== idOrSlug);
    s.units.forEach((u, i) => {
      u.searchOrder = i;
    });
    return s;
  });
  return sortBy(store.units, 'searchOrder');
}

async function reorderHomeUnits(ids) {
  const store = updateStore((s) => {
    s.units = applyOrder(s.units || [], ids, 'homeOrder');
    return s;
  });
  return sortBy(
    store.units.filter((u) => u.featured),
    'homeOrder'
  );
}

async function reorderSearchUnits(ids) {
  const store = updateStore((s) => {
    s.units = applyOrder(s.units || [], ids, 'searchOrder');
    return s;
  });
  return sortBy(store.units, 'searchOrder');
}

async function saveSettings(body) {
  const store = updateStore((s) => {
    s.settings = {
      ...(s.settings || {}),
      metaPixelId: String(body.metaPixelId ?? s.settings?.metaPixelId ?? ''),
      facebookPixelId: String(body.facebookPixelId ?? s.settings?.facebookPixelId ?? ''),
      googleAdsId: String(body.googleAdsId ?? s.settings?.googleAdsId ?? ''),
      gtmId: String(body.gtmId ?? s.settings?.gtmId ?? ''),
    };
    return s;
  });
  return store.settings;
}

async function createBooking(booking) {
  bookingsMem.unshift(booking);
  return booking;
}

async function listBookings() {
  return bookingsMem;
}

async function findBooking(id) {
  return bookingsMem.find((b) => b.id === id) || null;
}

async function findGuestByEmail(email) {
  const key = String(email || '').toLowerCase();
  const row = guestsMem.get(key);
  return row || null;
}

async function createGuest({ name, email, password }) {
  const key = String(email).toLowerCase();
  if (guestsMem.has(key)) {
    const err = new Error('Account already exists');
    err.status = 409;
    throw err;
  }
  const user = { id: randomUUID(), name: name || key.split('@')[0], email: key, password };
  guestsMem.set(key, user);
  return { id: user.id, name: user.name, email: user.email };
}

async function findGuestById(id) {
  for (const u of guestsMem.values()) {
    if (u.id === id) return u;
  }
  return null;
}

module.exports = {
  STORE_PATH,
  ensureStore,
  sortBy,
  slugify,
  newId,
  getDashboard,
  getPublicUnits,
  getPublicCompounds,
  getSlideshow,
  getSettings,
  getContent,
  findUnit,
  findCompound,
  listCompounds,
  listUnits,
  listSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  createCompound,
  updateCompound,
  deleteCompound,
  reorderCompounds,
  createUnit,
  updateUnit,
  deleteUnit,
  reorderHomeUnits,
  reorderSearchUnits,
  saveSettings,
  createBooking,
  listBookings,
  findBooking,
  findGuestByEmail,
  createGuest,
  findGuestById,
};
