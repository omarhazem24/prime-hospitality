const { randomUUID } = require('crypto');
const { getSupabase } = require('../config/supabase');
const {
  destinationFromRow,
  destinationToRow,
  compoundFromRow,
  compoundToRow,
  unitFromRow,
  unitToRow,
  slideFromRow,
  slideToRow,
  settingsFromRow,
  bookingFromRow,
  bookingToRow,
} = require('./mappers');
const {
  destinations: seedDestinations,
  compounds: seedCompounds,
  listings: seedListings,
  propertyTypes,
  partners,
  trustPoints,
  faqs,
} = require('../data/mock');
const { brandFromName } = require('../data/inventory');
const { COMPOUND_FIELDS, UNIT_FIELDS, applyFields, defaults, syncCoords } = require('./fields');
const { normalizeSite, mergeSite, sanitizeContentLists } = require('./siteContent');

function throwSb(error, fallback = 'Database error') {
  const err = new Error(error?.message || fallback);
  err.status = 500;
  err.cause = error;
  throw err;
}

function sortBy(arr, key) {
  return [...arr].sort((a, b) => (Number(a[key]) || 0) - (Number(b[key]) || 0));
}

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
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

async function listDestinations() {
  const { data, error } = await getSupabase()
    .from('destinations')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throwSb(error);
  return (data || []).map(destinationFromRow);
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
  const [units, compounds, destinations, slides, bookings] = await Promise.all([
    listUnits(),
    listCompounds(),
    listDestinations(),
    listSlides(),
    getSupabase().from('bookings').select('id', { count: 'exact', head: true }),
  ]);
  return {
    counts: {
      destinations: destinations.length,
      compounds: compounds.length,
      units: units.length,
      publishedUnits: units.filter((u) => u.published !== false).length,
      featuredUnits: units.filter((u) => u.featured).length,
      slides: slides.length,
      bookings: bookings.count || 0,
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

async function getPublicDestinations({ homeOnly = false } = {}) {
  let q = getSupabase().from('destinations').select('*').eq('published', true);
  if (homeOnly) q = q.eq('show_on_home', true);
  q = q.order('sort_order', { ascending: true });
  const { data, error } = await q;
  if (error) throwSb(error);
  return (data || []).map(destinationFromRow);
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

async function upsertSettingsColumns(columns) {
  const { data, error } = await getSupabase()
    .from('site_settings')
    .upsert({ id: 'default', ...columns, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throwSb(error);
  return settingsFromRow(data);
}

async function saveContent(body) {
  const current = await getContent();
  const row = await upsertSettingsColumns({ content: sanitizeContentLists(body, current) });
  return row.content;
}

async function getSite() {
  const row = await getSettingsRow();
  return normalizeSite(row.site);
}

async function saveSite(patch) {
  const row = await getSettingsRow();
  const saved = await upsertSettingsColumns({ site: mergeSite(row.site, patch) });
  return normalizeSite(saved.site);
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

async function findDestination(id) {
  const { data, error } = await getSupabase().from('destinations').select('*').eq('id', id).maybeSingle();
  if (error) throwSb(error);
  return destinationFromRow(data);
}

/** Denormalized copies: property ← destination name, unit type ← property + destination. */
async function linkCompound(compound) {
  const dest = compound.destinationId ? await findDestination(compound.destinationId) : null;
  compound.region = dest?.name || compound.region || '';
  compound.brand = compound.brand || brandFromName(compound.name);
  return compound;
}

async function linkUnit(unit) {
  const compound = unit.compoundId ? await findCompound(unit.compoundId) : null;
  if (!compound) return unit;
  unit.compound = compound.name;
  unit.brand = compound.brand || '';
  unit.destinationId = compound.destinationId || '';
  unit.destination = compound.region || '';
  unit.region = compound.region || '';
  if (!unit.city) unit.city = compound.city || '';
  return unit;
}

async function syncUnitsForCompound(compound) {
  const { error } = await getSupabase()
    .from('units')
    .update({
      compound: compound.name,
      brand: compound.brand || '',
      destination_id: compound.destinationId || '',
      destination: compound.region || '',
      region: compound.region || '',
      updated_at: new Date().toISOString(),
    })
    .eq('compound_id', compound.id);
  if (error) throwSb(error);
}

async function refreshUnitCount(compoundId) {
  if (!compoundId) return;
  const { count, error } = await getSupabase()
    .from('units')
    .select('id', { count: 'exact', head: true })
    .eq('compound_id', compoundId)
    .eq('published', true);
  if (error) throwSb(error);
  await getSupabase().from('compounds').update({ unit_count: count || 0 }).eq('id', compoundId);
}

/* ——— Destinations CRUD ——— */
async function createDestination(body) {
  const id = body.id || slugify(body.name);
  if (await findDestination(id)) throw conflict('Destination id already exists');
  const all = await listDestinations();
  const item = {
    id,
    name: body.name,
    description: body.description || '',
    image: body.image || '',
    sortOrder: all.length,
    showOnHome: body.showOnHome !== false,
    published: body.published !== false,
    kwentraDestinationId: body.kwentraDestinationId || '',
  };
  const { data, error } = await getSupabase()
    .from('destinations')
    .insert(destinationToRow(item))
    .select('*')
    .single();
  if (error) throwSb(error);
  return destinationFromRow(data);
}

async function updateDestination(id, body) {
  const current = await findDestination(id);
  if (!current) return null;
  const next = { ...current };
  for (const key of ['name', 'description', 'image', 'sortOrder', 'showOnHome', 'published', 'kwentraDestinationId']) {
    if (body?.[key] !== undefined) next[key] = body[key];
  }
  const { data, error } = await getSupabase()
    .from('destinations')
    .update(destinationToRow(next))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throwSb(error);
  if (body?.name !== undefined) {
    const compounds = (await listCompounds()).filter((c) => c.destinationId === id);
    for (const c of compounds) {
      c.region = next.name;
      await getSupabase().from('compounds').update({ region: next.name }).eq('id', c.id);
      await syncUnitsForCompound(c);
    }
  }
  return destinationFromRow(data);
}

async function deleteDestination(id) {
  const compounds = await listCompounds();
  if (compounds.some((c) => c.destinationId === id)) {
    throw conflict('Move or delete the properties in this destination first');
  }
  const { error } = await getSupabase().from('destinations').delete().eq('id', id);
  if (error) throwSb(error);
  const remaining = await listDestinations();
  return reorderDestinations(remaining.map((d) => d.id));
}

async function reorderDestinations(ids) {
  const sb = getSupabase();
  await Promise.all(ids.map((id, index) => sb.from('destinations').update({ sort_order: index }).eq('id', id)));
  return listDestinations();
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
  if (await findCompound(id)) throw conflict('Property id already exists');
  const compounds = await listCompounds();
  const item = await linkCompound({
    id,
    name: body.name,
    brand: body.brand || brandFromName(body.name),
    destinationId: body.destinationId || '',
    region: body.region || '',
    city: body.city || '',
    unitCount: 0,
    image: body.image || '',
    sortOrder: compounds.length,
    showOnHome: body.showOnHome !== false,
    published: body.published !== false,
    kwentraProjectId: body.kwentraProjectId || '',
    kwentraDestinationId: body.kwentraDestinationId || '',
    ...syncCoords(applyFields(defaults(COMPOUND_FIELDS), body, COMPOUND_FIELDS), body),
  });
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
    'brand',
    'destinationId',
    'city',
    'image',
    'showOnHome',
    'published',
    'sortOrder',
    'kwentraProjectId',
    'kwentraDestinationId',
  ];
  for (const key of fields) {
    if (body?.[key] !== undefined) next[key] = body[key];
  }
  applyFields(next, body, COMPOUND_FIELDS);
  syncCoords(next, body);
  await linkCompound(next);
  const { data, error } = await getSupabase()
    .from('compounds')
    .update(compoundToRow(next))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throwSb(error);
  await syncUnitsForCompound(next);
  return compoundFromRow(data);
}

async function deleteCompound(id) {
  const { count } = await getSupabase()
    .from('units')
    .select('id', { count: 'exact', head: true })
    .eq('compound_id', id);
  if (count) throw conflict('Delete or move the unit types in this property first');
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
  if (await findUnit(slug)) throw conflict('Slug already exists');
  const units = await listUnits();
  const item = {
    id: newId('unit'),
    slug,
    title: body.title,
    unitType: body.unitType || '',
    compoundId: body.compoundId || '',
    city: body.city || '',
    propertyType: body.propertyType || (body.unitType === 'Studio' ? 'Studio' : 'Apartment'),
    bedrooms: Number(body.bedrooms) || 0,
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
    ...applyFields(defaults(UNIT_FIELDS), body, UNIT_FIELDS),
  };
  await linkUnit(item);
  const { data, error } = await getSupabase().from('units').insert(unitToRow(item)).select('*').single();
  if (error) throwSb(error);
  await refreshUnitCount(item.compoundId);
  return unitFromRow(data);
}

async function updateUnit(idOrSlug, body) {
  const current = await findUnit(idOrSlug);
  if (!current) return null;
  const next = { ...current };
  const scalar = [
    'title',
    'slug',
    'unitType',
    'compoundId',
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
  applyFields(next, body, UNIT_FIELDS);
  await linkUnit(next);
  const { data, error } = await getSupabase()
    .from('units')
    .update(unitToRow(next))
    .eq('id', current.id)
    .select('*')
    .single();
  if (error) throwSb(error);
  await refreshUnitCount(next.compoundId);
  if (current.compoundId !== next.compoundId) await refreshUnitCount(current.compoundId);
  return unitFromRow(data);
}

async function deleteUnit(idOrSlug) {
  const current = await findUnit(idOrSlug);
  if (!current) return listUnits();
  const { error } = await getSupabase().from('units').delete().eq('id', current.id);
  if (error) throwSb(error);
  await refreshUnitCount(current.compoundId);
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
async function nextVoucherSerial() {
  const { data, error } = await getSupabase().rpc('next_voucher_serial');
  if (error) throwSb(error, 'Run supabase/schema.sql to create next_voucher_serial()');
  return Number(data);
}

async function createBooking(booking) {
  const { data, error } = await getSupabase()
    .from('bookings')
    .insert(bookingToRow(booking))
    .select('*')
    .single();
  if (error) throwSb(error);
  return bookingFromRow(data);
}

async function updateBooking(id, patch) {
  const row = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.paymentStatus !== undefined) row.payment_status = patch.paymentStatus;
  if (patch.kwentraReservationId !== undefined) row.kwentra_reservation_id = patch.kwentraReservationId;
  const { data, error } = await getSupabase()
    .from('bookings')
    .update(row)
    .eq('id', id)
    .select('*')
    .maybeSingle();
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findBooking(id) {
  const column = UUID_RE.test(String(id)) ? 'id' : 'voucher_number';
  const { data, error } = await getSupabase().from('bookings').select('*').eq(column, id).maybeSingle();
  if (error) throwSb(error);
  return bookingFromRow(data);
}

async function seedIfEmpty() {
  const compounds = await listCompounds();
  if (compounds.length) return { seeded: false };

  const destinationRows = seedDestinations.map(destinationToRow);
  const { error: dErr } = await getSupabase().from('destinations').upsert(destinationRows);
  if (dErr) throwSb(dErr);

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
  getPublicDestinations,
  getSlideshow,
  getSettings,
  getContent,
  saveContent,
  getSite,
  saveSite,
  findUnit,
  findCompound,
  findDestination,
  listDestinations,
  listCompounds,
  listUnits,
  listSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  createDestination,
  updateDestination,
  deleteDestination,
  reorderDestinations,
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
  nextVoucherSerial,
  createBooking,
  updateBooking,
  listBookings,
  findBooking,
  seedIfEmpty,
  DEFAULT_SLIDESHOW,
  defaultContent,
};
