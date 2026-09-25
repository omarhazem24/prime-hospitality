/**
 * Bidirectional Kwentra ↔ Prime sync orchestration.
 *
 * PULL from Kwentra:
 *  - Destinations
 *  - Projects (properties) inside destinations  → Prime "compounds"
 *  - Units / room types (details) — photos NEVER from Kwentra (CMS Drive folder)
 *  - Availability (blocked nights from reservations)
 *
 * PUSH to Kwentra:
 *  - Unit edits from CMS admin
 *  - New reservations (guest + stay) shaped like Reservation API docs
 *  - Payment amounts after on-site payment succeeds
 *
 * CMS overlays:
 *  - Destination / project cover images (Cloudinary)
 *  - Unit galleries (Google Drive folders)
 *  - Website flags: featured, published, sort, showOnHome
 */

const kwentra = require('./kwentraService');
const {
  listUnits: listCmsUnits,
  listCompounds: listCmsCompounds,
  findUnit,
  updateUnit,
} = require('../lib/cmsStore');

function envPath(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function destinationsPath() {
  return envPath('KWENTRA_PATH_DESTINATIONS', '/api/core/destination/v1');
}

function projectsPath() {
  return envPath('KWENTRA_PATH_PROJECTS', '/api/core/property/v1');
}

function roomTypesPath() {
  return envPath('KWENTRA_PATH_ROOM_TYPES', '/api/inventory/roomtype/v1');
}

function roomTypeWritePath(id) {
  const base = envPath('KWENTRA_PATH_ROOM_TYPE', '/api/inventory/roomtype/v1/:id');
  return base.replace(':id', encodeURIComponent(id));
}

function createReservationPath() {
  return envPath(
    'KWENTRA_PATH_CREATE_RESERVATION',
    '/api/reservation/individualreservation/v2'
  );
}

function paymentPath(reservationId) {
  const base = envPath(
    'KWENTRA_PATH_PAYMENT',
    '/api/reservation/individualreservation/v2/:id/payment'
  );
  return base.replace(':id', encodeURIComponent(reservationId));
}

function extractList(data, ...keys) {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeDestination(raw = {}) {
  const id = raw.id ?? raw.destination_id ?? raw.destinationId;
  return {
    kwentraDestinationId: id != null ? String(id) : '',
    name: raw.name || raw.title || raw.destination || `Destination ${id}`,
    description: raw.description || '',
    country: raw.country?.name || raw.country || raw.country_iso || '',
    raw,
  };
}

function normalizeProject(raw = {}) {
  const id = raw.id ?? raw.property_id ?? raw.project_id ?? raw.projectId;
  const destId =
    raw.destination_id ??
    raw.destinationId ??
    raw.destination?.id ??
    raw.parent_id ??
    null;
  return {
    kwentraProjectId: id != null ? String(id) : '',
    kwentraDestinationId: destId != null ? String(destId) : '',
    name: raw.name || raw.property_name || raw.title || `Project ${id}`,
    region: raw.destination?.name || raw.region || raw.area || '',
    city: raw.city || raw.location || '',
    description: raw.description || '',
    unitCount: Number(raw.unit_count ?? raw.room_count ?? raw.units ?? 0) || 0,
    raw,
  };
}

function normalizeRoomType(raw = {}) {
  const id = raw.id ?? raw.room_type_id ?? raw.roomTypeId;
  const name = raw.room_type || raw.name || raw.title || raw.description || `Room type ${id}`;
  const projectId =
    raw.property_id ?? raw.project_id ?? raw.property?.id ?? raw.projectId ?? null;
  return {
    kwentraRoomTypeId: id != null ? String(id) : '',
    kwentraProjectId: projectId != null ? String(projectId) : '',
    title: name,
    propertyType: raw.category || raw.property_type || 'Apartment',
    bedrooms: Number(raw.bedrooms ?? raw.number_of_bedrooms ?? 0) || undefined,
    bathrooms: Number(raw.bathrooms ?? raw.number_of_bathrooms ?? 0) || undefined,
    maxGuests: Number(raw.max_guests ?? raw.occupancy ?? raw.max_occupancy ?? 0) || undefined,
    areaSqm: Number(raw.area_sqm ?? raw.area ?? 0) || undefined,
    description: raw.description || raw.long_description || '',
    amenities: Array.isArray(raw.amenities) ? raw.amenities : undefined,
    pricePerNight: Number(raw.rack_rate ?? raw.base_rate ?? raw.price ?? 0) || undefined,
    currency: raw.currency?.code || raw.currency_code || raw.currency || undefined,
    raw,
  };
}

/**
 * PULL room types / units from Kwentra (details only — no photos).
 */
async function pullRoomTypes() {
  if (!kwentra.isConfigured()) {
    return { ok: false, reason: 'not_configured', items: [] };
  }
  const path = roomTypesPath();
  const raw = await pullRoomTypesRaw();
  const items = (raw.items || []).map(normalizeRoomType).filter((u) => u.kwentraRoomTypeId);
  return { ok: true, path, items, raw: raw.raw };
}

async function pullRoomTypesRaw() {
  const path = roomTypesPath();
  try {
    const data = await kwentra.kwentraFetch(path);
    return { items: extractList(data, 'room_types', 'items', 'data'), raw: data };
  } catch (err) {
    err.hint =
      'Ask Kwentra for the Room Type / Inventory list API path and set KWENTRA_PATH_ROOM_TYPES.';
    throw err;
  }
}

/**
 * PULL destinations from Kwentra.
 */
async function pullDestinations() {
  if (!kwentra.isConfigured()) {
    return { ok: false, reason: 'not_configured', items: [] };
  }
  const path = destinationsPath();
  try {
    const data = await kwentra.kwentraFetch(path);
    const items = extractList(data, 'destinations', 'items', 'data')
      .map(normalizeDestination)
      .filter((d) => d.kwentraDestinationId);
    return { ok: true, path, items, raw: data };
  } catch (err) {
    err.hint = 'Ask Kwentra for Destinations list API and set KWENTRA_PATH_DESTINATIONS.';
    throw err;
  }
}

/**
 * PULL projects (properties) — optionally filtered by destination.
 */
async function pullProjects({ destinationId } = {}) {
  if (!kwentra.isConfigured()) {
    return { ok: false, reason: 'not_configured', items: [] };
  }
  const path = projectsPath();
  try {
    const query = {};
    if (destinationId) {
      query.destination_id = destinationId;
      query.filter_destination_id = destinationId;
    }
    const data = await kwentra.kwentraFetch(path, { query });
    let items = extractList(data, 'properties', 'projects', 'items', 'data')
      .map(normalizeProject)
      .filter((p) => p.kwentraProjectId);
    if (destinationId) {
      items = items.filter(
        (p) => !p.kwentraDestinationId || String(p.kwentraDestinationId) === String(destinationId)
      );
    }
    return { ok: true, path, items, raw: data };
  } catch (err) {
    err.hint =
      'Ask Kwentra for Projects/Properties list API (nested under destinations) and set KWENTRA_PATH_PROJECTS.';
    throw err;
  }
}

/**
 * Merge destinations + projects with CMS compound overlays (Cloudinary images, home flags).
 * Hierarchy: Destination → Projects[] (Prime compounds).
 */
async function pullDestinationsTree({ homeOnly = false } = {}) {
  const cmsCompounds = await listCmsCompounds();
  const byProject = new Map(
    cmsCompounds
      .filter((c) => c.kwentraProjectId)
      .map((c) => [String(c.kwentraProjectId), c])
  );
  const byDestOverlay = new Map(
    cmsCompounds
      .filter((c) => c.kwentraDestinationId && !c.kwentraProjectId)
      .map((c) => [String(c.kwentraDestinationId), c])
  );

  let destinations = [];
  let projects = [];
  let source = 'cms';
  const errors = [];

  if (kwentra.isConfigured()) {
    try {
      const d = await pullDestinations();
      destinations = d.items || [];
      source = 'kwentra+cms';
    } catch (err) {
      errors.push({ kind: 'destinations', message: err.message, hint: err.hint });
      console.warn('[kwentra-sync] destinations pull failed:', err.message);
    }
    try {
      const p = await pullProjects();
      projects = p.items || [];
      source = 'kwentra+cms';
    } catch (err) {
      errors.push({ kind: 'projects', message: err.message, hint: err.hint });
      console.warn('[kwentra-sync] projects pull failed:', err.message);
    }
  }

  // Fallback: synthesize destinations from CMS compound.region
  if (!destinations.length) {
    const regionMap = new Map();
    for (const c of cmsCompounds) {
      const region = c.region || 'Other';
      if (!regionMap.has(region)) {
        regionMap.set(region, {
          id: `dest-${slugifyLocal(region)}`,
          kwentraDestinationId: '',
          name: region,
          description: '',
          country: '',
          image: '',
          sortOrder: regionMap.size,
          showOnHome: true,
          published: true,
          source: 'cms-region',
          projects: [],
        });
      }
    }
    destinations = [...regionMap.values()];
    if (!projects.length) {
      projects = cmsCompounds.map((c) => ({
        ...c,
        kwentraProjectId: c.kwentraProjectId || '',
        kwentraDestinationId: c.kwentraDestinationId || '',
        source: 'cms',
      }));
    }
  }

  const projectItems = projects.map((p) => {
    const overlay = byProject.get(String(p.kwentraProjectId)) || {};
    return {
      id: overlay.id || `proj-${p.kwentraProjectId}`,
      name: p.name || overlay.name,
      region: p.region || overlay.region || '',
      city: p.city || overlay.city || '',
      unitCount: p.unitCount || overlay.unitCount || 0,
      description: p.description || overlay.description || '',
      // CMS / Cloudinary only for cover art
      image: overlay.image || '',
      sortOrder: overlay.sortOrder ?? 999,
      showOnHome: overlay.showOnHome !== false,
      published: overlay.published !== false,
      kwentraProjectId: String(p.kwentraProjectId || ''),
      kwentraDestinationId: String(p.kwentraDestinationId || overlay.kwentraDestinationId || ''),
      destinationId: '', // filled below
      source: p.kwentraProjectId ? 'kwentra+cms' : 'cms',
    };
  });

  // Include CMS-only compounds not mapped to a Kwentra project (only when Kwentra returned projects)
  if (projects.length && source === 'kwentra+cms') {
    const mappedProjectIds = new Set(projectItems.map((p) => p.kwentraProjectId).filter(Boolean));
    for (const c of cmsCompounds) {
      if (c.kwentraProjectId && mappedProjectIds.has(String(c.kwentraProjectId))) continue;
      projectItems.push({
        ...c,
        kwentraProjectId: c.kwentraProjectId || '',
        kwentraDestinationId: c.kwentraDestinationId || '',
        source: 'cms-only',
      });
    }
  }

  const tree = destinations.map((d, index) => {
    const destKey = String(d.kwentraDestinationId || d.id || '');
    const overlay = byDestOverlay.get(destKey) || {};
    const destId = overlay.id || d.id || `dest-${d.kwentraDestinationId || index}`;
    const destProjects = projectItems
      .filter((p) => {
        if (d.kwentraDestinationId) {
          return String(p.kwentraDestinationId) === String(d.kwentraDestinationId);
        }
        // CMS region fallback match
        return (p.region || '') === (d.name || '');
      })
      .map((p) => ({ ...p, destinationId: destId, region: p.region || d.name }));

    return {
      id: destId,
      name: d.name,
      description: d.description || overlay.description || '',
      country: d.country || '',
      image: overlay.image || d.image || destProjects[0]?.image || '',
      sortOrder: overlay.sortOrder ?? index,
      showOnHome: overlay.showOnHome !== false,
      published: overlay.published !== false,
      kwentraDestinationId: String(d.kwentraDestinationId || ''),
      projectCount: destProjects.length,
      projects: destProjects.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
      source: d.kwentraDestinationId ? source : d.source || 'cms',
    };
  });

  let list = tree.filter((d) => d.published !== false);
  if (homeOnly) list = list.filter((d) => d.showOnHome !== false);
  list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const flatProjects = list.flatMap((d) => d.projects).filter((p) => p.published !== false);

  return {
    source,
    destinations: list,
    projects: homeOnly ? flatProjects.filter((p) => p.showOnHome !== false) : flatProjects,
    errors,
    needFromKwentra: errors.length
      ? errors.map((e) => e.hint || e.message).filter(Boolean)
      : null,
  };
}

function slugifyLocal(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Projects list for /api/compounds — Kwentra projects + CMS overlays.
 */
async function pullProjectsMerged({ homeOnly = false } = {}) {
  const tree = await pullDestinationsTree({ homeOnly: false });
  let items = tree.projects || [];
  if (homeOnly) items = items.filter((p) => p.showOnHome !== false);
  items = items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return {
    source: tree.source,
    items,
    destinations: tree.destinations,
    errors: tree.errors,
    needFromKwentra: tree.needFromKwentra,
    total: items.length,
  };
}

/**
 * Merge Kwentra room-type details with CMS overlays (Drive photos, featured, slug, etc.).
 * Photos ALWAYS come from CMS driveFolderUrl / images — never from Kwentra.
 */
async function pullUnitsMerged({ publishedOnly = true } = {}) {
  const cmsUnits = await listCmsUnits();
  const byRoomType = new Map(
    cmsUnits
      .filter((u) => u.kwentraRoomTypeId)
      .map((u) => [String(u.kwentraRoomTypeId), u])
  );
  const byId = new Map(cmsUnits.map((u) => [u.id, u]));

  let kwentraItems = [];
  let source = 'cms';
  let pullError = null;

  if (kwentra.isConfigured()) {
    try {
      const pulled = await pullRoomTypes();
      kwentraItems = pulled.items || [];
      source = 'kwentra+cms';
    } catch (err) {
      pullError = err.message;
      source = 'cms';
      console.warn('[kwentra-sync] room types pull failed — using CMS units:', err.message);
    }
  }

  if (kwentraItems.length) {
    const merged = kwentraItems.map((kt) => {
      const overlay = byRoomType.get(String(kt.kwentraRoomTypeId)) || {};
      return {
        ...kt,
        id: overlay.id || `kw-${kt.kwentraRoomTypeId}`,
        slug: overlay.slug || `room-type-${kt.kwentraRoomTypeId}`,
        // CMS / Drive only
        images: overlay.images || [],
        driveFolderUrl: overlay.driveFolderUrl || '',
        featured: overlay.featured ?? false,
        published: overlay.published !== false,
        homeOrder: overlay.homeOrder ?? 999,
        searchOrder: overlay.searchOrder ?? 0,
        compoundId: overlay.compoundId || '',
        compound: overlay.compound || '',
        region: overlay.region || '',
        city: overlay.city || '',
        // Prefer Kwentra details when present
        title: kt.title || overlay.title,
        description: kt.description || overlay.description || '',
        bedrooms: kt.bedrooms ?? overlay.bedrooms,
        bathrooms: kt.bathrooms ?? overlay.bathrooms,
        maxGuests: kt.maxGuests ?? overlay.maxGuests,
        areaSqm: kt.areaSqm ?? overlay.areaSqm,
        pricePerNight: kt.pricePerNight ?? overlay.pricePerNight,
        currency: kt.currency || overlay.currency || 'EGP',
        propertyType: kt.propertyType || overlay.propertyType || 'Apartment',
        amenities: kt.amenities || overlay.amenities || [],
        kwentraRoomTypeId: String(kt.kwentraRoomTypeId),
        source: 'kwentra+cms',
      };
    });

    let list = merged;
    if (publishedOnly) list = list.filter((u) => u.published !== false);

    // Include CMS-only units (not yet mapped) so nothing disappears
    const mappedIds = new Set(merged.map((u) => String(u.kwentraRoomTypeId)));
    for (const u of cmsUnits) {
      if (u.kwentraRoomTypeId && mappedIds.has(String(u.kwentraRoomTypeId))) continue;
      if (publishedOnly && u.published === false) continue;
      list.push({ ...u, source: u.kwentraRoomTypeId ? 'cms-unmapped-pull' : 'cms-only' });
    }

    return { source, items: list, pullError, total: list.length };
  }

  // No Kwentra catalog — CMS units (still attach Drive photos locally)
  let list = cmsUnits;
  if (publishedOnly) list = list.filter((u) => u.published !== false);
  return {
    source,
    items: list.map((u) => ({ ...u, source: 'cms' })),
    pullError,
    total: list.length,
    needFromKwentra: !pullError
      ? null
      : 'Room Type list API (KWENTRA_PATH_ROOM_TYPES)',
  };
}

/**
 * PULL availability for a listing / room type.
 */
async function pullAvailability(listingOrSlug, { from, to } = {}) {
  const listing =
    typeof listingOrSlug === 'object' && listingOrSlug
      ? listingOrSlug
      : await findUnit(listingOrSlug);
  if (!listing) {
    const err = new Error('Listing not found');
    err.status = 404;
    throw err;
  }
  const roomTypeId = listing.kwentraRoomTypeId || listing.pmsRoomTypeId || null;
  if (kwentra.isConfigured()) {
    const avail = await kwentra.getAvailability(roomTypeId, { from, to });
    return {
      source: 'kwentra',
      slug: listing.slug,
      roomTypeId,
      ...avail,
    };
  }
  const { resolveWindow, buildAvailability, buildPricing } = require('../lib/mockCalendar');
  const window = resolveWindow({ from, to });
  const { blocked, checkout_dates } = buildAvailability(listing, window.from, window.to);
  const { prices, currency } = buildPricing(listing, window.from, window.to);
  return {
    source: 'mock',
    slug: listing.slug,
    roomTypeId,
    blocked,
    checkoutDates: checkout_dates,
    prices,
    currency,
  };
}

/**
 * PUSH unit edits from CMS admin → Kwentra room type.
 * Locally we always save Drive photos / marketing fields.
 */
async function pushUnitEdit(unit) {
  if (!kwentra.isConfigured() || !unit?.kwentraRoomTypeId) {
    return {
      pushed: false,
      reason: !kwentra.isConfigured() ? 'not_configured' : 'missing_kwentraRoomTypeId',
    };
  }
  const { kwentraFetch } = getFetch();
  const path = roomTypeWritePath(unit.kwentraRoomTypeId);
  const body = {
    id: unit.kwentraRoomTypeId,
    room_type: unit.title,
    name: unit.title,
    description: unit.description || '',
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    max_guests: unit.maxGuests,
    area_sqm: unit.areaSqm,
    rack_rate: unit.pricePerNight,
    // Never send photos — Kwentra does not carry them
  };
  try {
    const data = await kwentraFetch(path, { method: 'PUT', body });
    return { pushed: true, path, data };
  } catch (err) {
    return {
      pushed: false,
      path,
      error: err.message,
      needFromKwentra: 'Room Type update (PUT/PATCH) API documentation',
    };
  }
}

/**
 * Build reservation body shaped like Kwentra Reservation API docs.
 */
function buildReservationPayload({
  listing,
  guestProfileId,
  name,
  email,
  phone,
  guests,
  checkIn,
  checkOut,
  notes,
  externalRef,
  amount,
  currency = 'EGP',
  rateId,
  boardTypeId,
  sourceId,
  channelId,
  guaranteeType,
}) {
  const adults = Number(guests) || 2;
  const roomTypeId = Number(listing?.kwentraRoomTypeId) || listing?.kwentraRoomTypeId;
  const nameParts = String(name || '').trim().split(/\s+/);
  const first_name = nameParts[0] || 'Guest';
  const last_name = nameParts.slice(1).join(' ') || first_name;

  return {
    arrival_date: checkIn,
    departure_date: checkOut,
    check_in_time: process.env.KWENTRA_DEFAULT_CHECKIN || '15:00:00',
    check_out_time: process.env.KWENTRA_DEFAULT_CHECKOUT || '12:00:00',
    voucher_no: externalRef || '',
    remarks: notes || '',
    purpose_of_stay: '1',
    reservation_mode: 'daily',
    hold_status: 'CONFIRMED',
    reservation_confirmation: 'Confirmed',
    guarantee_type: guaranteeType != null ? Number(guaranteeType) : Number(process.env.KWENTRA_GUARANTEE_TYPE || 3),
    source: sourceId != null ? { id: Number(sourceId) } : process.env.KWENTRA_SOURCE_ID
      ? { id: Number(process.env.KWENTRA_SOURCE_ID) }
      : undefined,
    channel: channelId != null ? { id: Number(channelId) } : process.env.KWENTRA_CHANNEL_ID
      ? { id: Number(process.env.KWENTRA_CHANNEL_ID), name: 'Individual' }
      : { id: 2, name: 'Individual' },
    // Link to Individual Profile when we have one
    name: guestProfileId
      ? { id: Number(guestProfileId) || guestProfileId, first_name, last_name, name: `${first_name} ${last_name}` }
      : { first_name, last_name, name: `${first_name} ${last_name}`, email, mobile: phone },
    room_nights: [
      {
        room_type: { id: roomTypeId },
        actual_room_type: { id: roomTypeId },
        rate: rateId != null ? { id: Number(rateId) } : process.env.KWENTRA_DEFAULT_RATE_ID
          ? { id: Number(process.env.KWENTRA_DEFAULT_RATE_ID) }
          : undefined,
        board_type: boardTypeId != null ? { id: Number(boardTypeId) } : process.env.KWENTRA_DEFAULT_BOARD_TYPE_ID
          ? { id: Number(process.env.KWENTRA_DEFAULT_BOARD_TYPE_ID) }
          : undefined,
        currency: { id: Number(process.env.KWENTRA_CURRENCY_ID || 1) },
        from_date: checkIn,
        // Kwentra room_nights.to_date is last night (departure - 1 day) in their examples
        to_date: checkoutMinusOne(checkOut) || checkIn,
        number_of_adults: adults,
        number_of_children: 0,
      },
    ],
    // Payment intent metadata (also pushed separately after capture)
    balance: amount != null ? Number(amount) : undefined,
    _prime: {
      email,
      phone,
      amount,
      currency,
      externalRef,
      listingSlug: listing?.slug,
    },
  };
}

function checkoutMinusOne(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * PUSH reservation to Kwentra (blocks dates via Expected/Checked In state).
 */
async function pushReservation(payload) {
  if (!kwentra.isConfigured()) {
    return { pushed: false, reason: 'not_configured' };
  }
  if (!envPath('KWENTRA_PATH_CREATE_RESERVATION') && process.env.KWENTRA_ALLOW_DEFAULT_CREATE !== 'true') {
    // Still attempt default path if explicitly allowed; otherwise report need
    // We try the conventional v2 collection POST — many tenants enable it even if not in the Word doc.
  }
  const { kwentraFetch } = getFetch();
  const path = createReservationPath();
  try {
    const data = await kwentraFetch(path, { method: 'POST', body: payload });
    const id =
      data?.id ||
      data?.reservation?.id ||
      data?.results?.reservations?.[0]?.id ||
      null;
    return { pushed: true, path, reservationId: id, data };
  } catch (err) {
    return {
      pushed: false,
      path,
      error: err.message,
      status: err.status,
      needFromKwentra:
        'POST create Individual Reservation API (body: arrival_date, departure_date, room_nights, name/profile, state Expected)',
    };
  }
}

/**
 * PUSH payment / money paid to Kwentra for a reservation.
 */
async function pushPayment({ reservationId, amount, currency = 'EGP', merchantOrderId, provider, transactionId }) {
  if (!kwentra.isConfigured() || !reservationId) {
    return { pushed: false, reason: !reservationId ? 'missing_reservation_id' : 'not_configured' };
  }
  const { kwentraFetch } = getFetch();
  const path = paymentPath(reservationId);
  const body = {
    amount: Number(amount),
    currency,
    status: 'paid',
    payment_status: 'paid',
    merchant_order_id: merchantOrderId,
    provider,
    transaction_id: transactionId,
    method: provider || 'online',
  };
  try {
    const data = await kwentraFetch(path, { method: 'POST', body });
    return { pushed: true, path, data };
  } catch (err) {
    // Fallback: try posting a note on the reservation / profile if payment endpoint missing
    return {
      pushed: false,
      path,
      error: err.message,
      needFromKwentra:
        'Payment / folio posting API for a reservation (amount paid, currency, transaction ref)',
    };
  }
}

/**
 * Admin saves a unit: persist CMS overlay (Drive photos) + push details to Kwentra.
 */
async function saveUnitWithSync(idOrSlug, body) {
  const saved = await updateUnit(idOrSlug, body);
  if (!saved) return { unit: null, kwentra: { pushed: false } };
  const kw = await pushUnitEdit(saved);
  return { unit: saved, kwentra: kw };
}

function getFetch() {
  return { kwentraFetch: kwentra.kwentraFetch };
}

module.exports = {
  pullRoomTypes,
  pullUnitsMerged,
  pullAvailability,
  pullDestinations,
  pullProjects,
  pullDestinationsTree,
  pullProjectsMerged,
  pushUnitEdit,
  pushReservation,
  pushPayment,
  buildReservationPayload,
  saveUnitWithSync,
  normalizeRoomType,
  normalizeDestination,
  normalizeProject,
};
