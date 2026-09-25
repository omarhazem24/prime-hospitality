const { randomUUID } = require('crypto');
const { getSupabase } = require('../config/supabase');
const {
  compoundFromRow,
  compoundToRow,
  unitFromRow,
  unitToRow,
  slideFromRow,
  slideToRow,
  settingsFromRow,
  bookingFromRow,
} = require('./mappers');
const { compounds: seedCompounds, listings: seedListings, propertyTypes, partners, trustPoints, faqs } =
  require('../data/mock');

function throwSb(error, fallback = 'Database error') {
  const err = new Error(error?.message || fallback);
  err.status = 500;
  err.cause = error;
  throw err;
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

function defaultContent() {
  return { propertyTypes, partners, trustPoints, faqs };
}

async function listCompounds() {
  const { data, error } = await getSupabase()
    .from('compounds')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throwSb(error);
  return (data || []).map(compoundFromRow);
}

async function listUnits() {
  const { data, error } = await getSupabase()
    .from('units')
    .select('*')
    .order('search_order', { ascending: true });
  if (error) throwSb(error);
  return (data || []).map(unitFromRow);
}

async function listSlides() {
  const { data, error } = await getSupabase()
    .from('slideshow_slides')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throwSb(error);
  return (data || []).map(slideFromRow);
}

async function getSettingsRow() {
  const { data, error } = await getSupabase()
    .from('site_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throwSb(error);
  return settingsFromRow(data);
}

async function getDashboard() {
  const [units, compounds, slides] = await Promise.all([listUnits(), listCompounds(), listSlides()]);
  return {
    counts: {
      units: units.length,
      publishedUnits: units.filter((u) => u.published !== false).length,
      featuredUnits: units.filter((u) => u.featured).length,
      compounds: compounds.length,
      slides: slides.length,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function getPublicUnits({ featuredOnly = false, publishedOnly = true } = {}) {
  let q = getSupabase().from('units').select('*');
  if (publishedOnly) q = q.eq('published', true);
  if (featuredOnly) q = q.eq('featured', true);
  q = q.order(featuredOnly ? 'home_order' : 'search_order', { ascending: true });
  const { data, error } = await q;
  if (error) throwSb(error);
  return (data || []).map(unitFromRow);
}

async function getPublicCompounds({ homeOnly = false } = {}) {
  let q = getSupabase().from('compounds').select('*').eq('published', true);
  if (homeOnly) q = q.eq('show_on_home', true);
  q = q.order('sort_order', { ascending: true });
  const { data, error } = await q;
  if (error) throwSb(error);
  return (data || []).map(compoundFromRow);
}

async function getSlideshow() {
  const { data, error } = await getSupabase()
    .from('slideshow_slides')
    .select('*')
    .eq('enabled', true)
    .order('sort_order', { ascending: true });
  if (error) throwSb(error);
  return (data || []).map(slideFromRow);
}

async function getSettings() {
  const row = await getSettingsRow();
  return {
    metaPixelId: row.metaPixelId,
    facebookPixelId: row.facebookPixelId,
    googleAdsId: row.googleAdsId,
    gtmId: row.gtmId,
  };
}

async function getContent() {
  const row = await getSettingsRow();
  const content = row.content && Object.keys(row.content).length ? row.content : defaultContent();
  return content;
}

async function findUnit(idOrSlug) {
  const sb = getSupabase();
  let { data, error } = await sb.from('units').select('*').eq('id', idOrSlug).maybeSingle();
  if (error) throwSb(error);
  if (!data) {
    ({ data, error } = await sb.from('units').select('*').eq('slug', idOrSlug).maybeSingle());
    if (error) throwSb(error);
  }
  return unitFromRow(data);
}

async function findCompound(id) {
  const { data, error } = await getSupabase().from('compounds').select('*').eq('id', id).maybeSingle();
  if (error) throwSb(error);
  return compoundFromRow(data);
}

/* ——— Slideshow CRUD ——— */
async function createSlide({ image, alt = '', enabled = true }) {
  const slides = await listSlides();
  const item = {
    id: newId('slide'),
    image,
    alt,
    enabled: enabled !== false,
    sortOrder: slides.length,
  };
  const { data, error } = await getSupabase()
    .from('slideshow_slides')
    .insert(slideToRow(item))
    .select('*')
    .single();
  if (error) throwSb(error);
  return slideFromRow(data);
}

async function updateSlide(id, patch) {
  const current = (await listSlides()).find((s) => s.id === id);
  if (!current) return null;
  const next = { ...current, ...patch, id };
  const { data, error } = await getSupabase()
    .from('slideshow_slides')
    .update(slideToRow(next))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throwSb(error);
  return slideFromRow(data);
}

async function deleteSlide(id) {
  const { error } = await getSupabase().from('slideshow_slides').delete().eq('id', id);
  if (error) throwSb(error);
  const remaining = await listSlides();
  await reorderSlides(remaining.map((s) => s.id));
  return listSlides();
}

async function reorderSlides(ids) {
  const sb = getSupabase();
  await Promise.all(
    ids.map((id, index) => sb.from('slideshow_slides').update({ sort_order: index }).eq('id', id))
  );
  return listSlides();
}

/* ——— Compounds CRUD ——— */
async function createCompound(body) {
  const id = body.id || slugify(body.name);
  const existing = await findCompound(id);
  if (existing) {
    const err = new Error('Compound id already exists');
    err.status = 409;
    throw err;
  }
  const compounds = await listCompounds();
  const item = {
    id,
    name: body.name,
    region: body.region || '',
    destinationId: body.destinationId || '',
    unitCount: Number(body.unitCount) || 0,
    image: body.image || '',
    sortOrder: compounds.length,
    showOnHome: body.showOnHome !== false,
    published: body.published !== false,
    kwentraProjectId: body.kwentraProjectId || '',
    kwentraDestinationId: body.kwentraDestinationId || '',
  };
  const { data, error } = await getSupabase()
    .from('compounds')
    .insert(compoundToRow(item))
    .select('*')
    .single();
  if (error) throwSb(error);
  return compoundFromRow(data);
}

async function updateCompound(id, body) {
  const current = await findCompound(id);
  if (!current) return null;
  const next = { ...current };
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
    if (body?.[key] !== undefined) next[key] = body[key];
  }
  if (body?.unitCount !== undefined) next.unitCount = Number(body.unitCount) || 0;
  const { data, error } = await getSupabase()
    .from('compounds')
    .update(compoundToRow(next))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throwSb(error);
  return compoundFromRow(data);
}

async function deleteCompound(id) {
  const { error } = await getSupabase().from('compounds').delete().eq('id', id);
  if (error) throwSb(error);
  const remaining = await listCompounds();
  await reorderCompounds(remaining.map((c) => c.id));
  return listCompounds();
}

async function reorderCompounds(ids) {
  const sb = getSupabase();
  await Promise.all(
    ids.map((id, index) => sb.from('compounds').update({ sort_order: index, updated_at: new Date().toISOString() }).eq('id', id))
  );
  return listCompounds();
}

/* ——— Units CRUD ——— */
async function createUnit(body) {
  const slug = body.slug || slugify(body.title);
  if (await findUnit(slug)) {
    const err = new Error('Slug already exists');
    err.status = 409;
    throw err;
  }
  const compound = body.compoundId ? await findCompound(body.compoundId) : null;
  const units = await listUnits();
  const item = {
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
    searchOrder: units.length,
    averageRating: body.averageRating || 0,
    reviewCount: body.reviewCount || 0,
    reviews: Array.isArray(body.reviews) ? body.reviews : [],
  };
  const { data, error } = await getSupabase().from('units').insert(unitToRow(item)).select('*').single();
  if (error) throwSb(error);
  return unitFromRow(data);
}

async function updateUnit(idOrSlug, body) {
  const current = await findUnit(idOrSlug);
  if (!current) return null;
  const next = { ...current };
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
    if (body[key] !== undefined) next[key] = body[key];
  }
  const nums = ['bedrooms', 'bathrooms', 'areaSqm', 'maxGuests', 'pricePerNight'];
  for (const key of nums) {
    if (body[key] !== undefined) next[key] = Number(body[key]) || 0;
  }
  if (Array.isArray(body.amenities)) next.amenities = body.amenities;
  if (Array.isArray(body.facilities)) next.facilities = body.facilities;
  if (Array.isArray(body.images)) next.images = body.images;
  if (body.compoundId) {
    const compound = await findCompound(body.compoundId);
    if (compound && !body.compound) next.compound = compound.name;
    if (compound && !body.region) next.region = compound.region;
  }
  const { data, error } = await getSupabase()
    .from('units')
    .update(unitToRow(next))
    .eq('id', current.id)
    .select('*')
    .single();
  if (error) throwSb(error);
  return unitFromRow(data);
}

async function deleteUnit(idOrSlug) {
  const current = await findUnit(idOrSlug);
  if (!current) return listUnits();
  const { error } = await getSupabase().from('units').delete().eq('id', current.id);
  if (error) throwSb(error);
  const remaining = await listUnits();
  await reorderSearchUnits(remaining.map((u) => u.id));
  return listUnits();
}

async function reorderHomeUnits(ids) {
  const sb = getSupabase();
  await Promise.all(
    ids.map((id, index) =>
      sb.from('units').update({ home_order: index, updated_at: new Date().toISOString() }).eq('id', id)
    )
  );
  const units = await listUnits();
  return sortBy(
    units.filter((u) => u.featured),
    'homeOrder'
  );
}

async function reorderSearchUnits(ids) {
  const sb = getSupabase();
  await Promise.all(
    ids.map((id, index) =>
      sb.from('units').update({ search_order: index, updated_at: new Date().toISOString() }).eq('id', id)
    )
  );
  return listUnits();
}

async function saveSettings(body) {
  const current = await getSettings();
  const next = {
    meta_pixel_id: String(body.metaPixelId ?? current.metaPixelId ?? ''),
    facebook_pixel_id: String(body.facebookPixelId ?? current.facebookPixelId ?? ''),
    google_ads_id: String(body.googleAdsId ?? current.googleAdsId ?? ''),
    gtm_id: String(body.gtmId ?? current.gtmId ?? ''),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabase()
    .from('site_settings')
    .upsert({ id: 'default', ...next }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throwSb(error);
  const row = settingsFromRow(data);
  return {
    metaPixelId: row.metaPixelId,
    facebookPixelId: row.facebookPixelId,
    googleAdsId: row.googleAdsId,
    gtmId: row.gtmId,
  };
}

/* ——— Bookings ——— */
async function createBooking(booking) {
  const row = {
    id: booking.id,
    status: booking.status || 'requested',
    slug: booking.slug,
    listing_id: booking.listingId,
    listing_title: booking.listingTitle,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    guests: booking.guests,
    check_in: booking.checkIn,
    check_out: booking.checkOut,
    notes: booking.notes,
    price_per_night: booking.pricePerNight,
    currency: booking.currency,
  };
  const { data, error } = await getSupabase().from('bookings').insert(row).select('*').single();
  if (error) throwSb(error);
  return bookingFromRow(data);
}

async function listBookings() {
  const { data, error } = await getSupabase()
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throwSb(error);
  return (data || []).map(bookingFromRow);
}

async function findBooking(id) {
  const { data, error } = await getSupabase().from('bookings').select('*').eq('id', id).maybeSingle();
  if (error) throwSb(error);
  return bookingFromRow(data);
}

/* ——— Guests ——— */
async function findGuestByEmail(email) {
  const key = String(email || '').toLowerCase();
  const { data, error } = await getSupabase().from('guests').select('*').eq('email', key).maybeSingle();
  if (error) throwSb(error);
  return data;
}

async function createGuest({ name, email, password }) {
  const row = {
    email: String(email).toLowerCase(),
    name: name || String(email).split('@')[0],
    password,
  };
  const { data, error } = await getSupabase().from('guests').insert(row).select('*').single();
  if (error) {
    if (error.code === '23505') {
      const err = new Error('Account already exists');
      err.status = 409;
      throw err;
    }
    throwSb(error);
  }
  return { id: data.id, name: data.name, email: data.email };
}

async function findGuestById(id) {
  const { data, error } = await getSupabase().from('guests').select('*').eq('id', id).maybeSingle();
  if (error) throwSb(error);
  if (!data) return null;
  return { id: data.id, name: data.name, email: data.email, password: data.password };
}

async function seedIfEmpty() {
  const compounds = await listCompounds();
  if (compounds.length) return { seeded: false };

  const compoundRows = seedCompounds.map((c, i) =>
    compoundToRow({
      ...c,
      sortOrder: i,
      showOnHome: true,
      published: true,
    })
  );
  const { error: cErr } = await getSupabase().from('compounds').upsert(compoundRows);
  if (cErr) throwSb(cErr);

  const unitRows = seedListings.map((l, i) =>
    unitToRow({
      ...l,
      published: l.available !== false,
      homeOrder: l.featured ? i : 1000 + i,
      searchOrder: i,
      driveFolderUrl: '',
      amenities: l.amenities || [],
      facilities: l.facilities || [],
      reviews: l.reviews || [],
    })
  );
  const { error: uErr } = await getSupabase().from('units').upsert(unitRows);
  if (uErr) throwSb(uErr);

  const slideRows = DEFAULT_SLIDESHOW.map(slideToRow);
  const { error: sErr } = await getSupabase().from('slideshow_slides').upsert(slideRows);
  if (sErr) throwSb(sErr);

  const { error: setErr } = await getSupabase()
    .from('site_settings')
    .upsert(
      {
        id: 'default',
        content: defaultContent(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  if (setErr) throwSb(setErr);

  return { seeded: true };
}

module.exports = {
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
  seedIfEmpty,
  DEFAULT_SLIDESHOW,
  defaultContent,
};
