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
  listDestinations: listCmsDestinations,
  findUnit,
  updateUnit,
  createUnit,
  createCompound,
  updateCompound,
  createDestination,
  updateDestination,
  slugify,
} = require('../lib/cmsStore');
const { brandFromName } = require('../data/inventory');
const { coordsFromMapsUrl } = require('../lib/fields');

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

function roomsPath() {
  return envPath('KWENTRA_PATH_ROOMS', '/api/inventory/room/v1');
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

const firstOf = (...values) => values.find((v) => v != null && v !== '');
const nameOf = (v) => (v && typeof v === 'object' ? v.name || v.title || v.description || '' : v || '');
const positive = (v) => (Number(v) > 0 ? Number(v) : undefined);

/** Kwentra lists come as strings, {name} objects, or a delimited string */
function namesList(value) {
  if (Array.isArray(value)) return value.map(nameOf).map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n|,|\s\/\s|\s-\s/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function normalizeProject(raw = {}) {
  const id = raw.id ?? raw.property_id ?? raw.project_id ?? raw.projectId;
  const destId =
    raw.destination_id ??
    raw.destinationId ??
    raw.destination?.id ??
    raw.parent_id ??
    null;
  const address = raw.address && typeof raw.address === 'object' ? raw.address : null;
  const lat = Number(firstOf(raw.latitude, raw.lat, raw.location?.latitude, address?.latitude));
  const lng = Number(firstOf(raw.longitude, raw.lng, raw.long, raw.location?.longitude, address?.longitude));
  return {
    kwentraProjectId: id != null ? String(id) : '',
    kwentraDestinationId: destId != null ? String(destId) : '',
    name: raw.name || raw.property_name || raw.title || `Project ${id}`,
    region: raw.destination?.name || raw.region || raw.area || '',
    city: nameOf(firstOf(raw.city, address?.city, raw.location)) || '',
    description: raw.description || raw.long_description || '',
    unitCount: Number(raw.unit_count ?? raw.room_count ?? raw.units ?? 0) || 0,
    address: firstOf(address?.street, address?.line1, typeof raw.address === 'string' ? raw.address : '', raw.street) || '',
    buildingNumber: String(firstOf(raw.building_number, raw.building_no, address?.building_number) || ''),
    phone: String(firstOf(raw.phone, raw.telephone, raw.mobile, raw.contact_phone) || ''),
    mapsUrl: firstOf(raw.google_maps, raw.google_maps_url, raw.map_url, raw.maps_url) || '',
    latitude: Number.isFinite(lat) && lat !== 0 ? lat : undefined,
    longitude: Number.isFinite(lng) && lng !== 0 ? lng : undefined,
    facilities: namesList(firstOf(raw.facilities, raw.amenities, raw.services)),
    raw,
  };
}

function normalizeRoomType(raw = {}) {
  const id = raw.id ?? raw.room_type_id ?? raw.roomTypeId;
  const name = raw.room_type || raw.name || raw.title || raw.description || `Room type ${id}`;
  const projectId =
    raw.property_id ?? raw.project_id ?? raw.property?.id ?? raw.projectId ?? null;
  const rooms = Array.isArray(raw.rooms) ? raw.rooms : null;
  const unitNumbers = rooms
    ? rooms.map((r) => String(r?.room_number ?? r?.number ?? r?.name ?? r ?? '').trim()).filter(Boolean)
    : namesList(raw.room_numbers);
  return {
    kwentraRoomTypeId: id != null ? String(id) : '',
    kwentraProjectId: projectId != null ? String(projectId) : '',
    title: name,
    propertyType: nameOf(raw.category) || raw.property_type || undefined,
    bedrooms: positive(raw.bedrooms ?? raw.number_of_bedrooms),
    bathrooms: positive(raw.bathrooms ?? raw.number_of_bathrooms),
    maxGuests: positive(raw.max_adults ?? raw.max_guests ?? raw.occupancy ?? raw.max_occupancy),
    areaSqm: positive(raw.area_sqm ?? raw.size ?? raw.area),
    description: raw.long_description || (raw.room_type || raw.name ? raw.description : '') || '',
    amenities: namesList(firstOf(raw.amenities, raw.features, raw.facilities)),
    pricePerNight: positive(raw.rack_rate ?? raw.base_rate ?? raw.price),
    currency: raw.currency?.code || raw.currency_code || (typeof raw.currency === 'string' ? raw.currency : undefined),
    roomCount: positive(raw.number_of_rooms ?? raw.rooms_count ?? raw.room_count ?? raw.inventory) ?? (unitNumbers?.length || undefined),
    unitNumbers: unitNumbers?.length ? unitNumbers : undefined,
    floor: nameOf(firstOf(raw.floor, raw.floor_name)) || undefined,
    bedType: nameOf(firstOf(raw.bed_type, raw.bedding)) || undefined,
    raw,
  };
}

/** Physical room → { roomTypeId, number, floor } */
function normalizeRoom(raw = {}) {
  const typeId = raw.room_type_id ?? raw.room_type?.id ?? raw.roomTypeId ?? raw.actual_room_type?.id;
  return {
    roomTypeId: typeId != null ? String(typeId) : '',
    number: String(raw.room_number ?? raw.number ?? raw.name ?? '').trim(),
    floor: nameOf(firstOf(raw.floor, raw.floor_name, raw.floor_number)),
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

/** Public projection of a property — internal fields (phone, Drive links, sync snapshot) stay server-side */
function publicProperty(c) {
  return {
    id: c.id,
    name: c.name,
    brand: c.brand || brandFromName(c.name),
    destinationId: c.destinationId || '',
    region: c.region || '',
    city: c.city || '',
    unitCount: Number(c.unitCount) || 0,
    description: c.description || '',
    address: c.address || '',
    mapsUrl: c.mapsUrl || '',
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,
    facilities: c.facilities || [],
    image: c.image || '',
    sortOrder: c.sortOrder ?? 999,
    showOnHome: c.showOnHome !== false,
    published: c.published !== false,
    kwentraProjectId: String(c.kwentraProjectId || ''),
    kwentraDestinationId: String(c.kwentraDestinationId || ''),
  };
}

/**
 * Destination → Properties tree, served from the CMS store.
 * Kwentra data reaches the store through syncFromKwentra() (admin "Sync now" + the auto-sync timer),
 * so page views never wait on the PMS.
 */
async function pullDestinationsTree({ homeOnly = false } = {}) {
  const [cmsDestinations, cmsCompounds] = await Promise.all([listCmsDestinations(), listCmsCompounds()]);
  const projects = cmsCompounds.map(publicProperty);

  const tree = cmsDestinations.map((d, index) => {
    const destProjects = projects
      .filter((p) => (p.destinationId ? p.destinationId === d.id : p.region === d.name))
      .map((p) => ({ ...p, destinationId: d.id, region: d.name }))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const visible = destProjects.filter((p) => p.published !== false);
    return {
      id: d.id,
      name: d.name,
      description: d.description || '',
      country: d.country || '',
      image: d.image || visible[0]?.image || '',
      sortOrder: d.sortOrder ?? index,
      showOnHome: d.showOnHome !== false,
      published: d.published !== false,
      kwentraDestinationId: String(d.kwentraDestinationId || ''),
      projectCount: visible.length,
      unitTypeCount: visible.reduce((s, p) => s + (Number(p.unitCount) || 0), 0),
      projects: visible,
      source: d.kwentraDestinationId ? 'kwentra+cms' : 'cms',
    };
  });

  let list = tree.filter((d) => d.published !== false);
  if (homeOnly) list = list.filter((d) => d.showOnHome !== false);
  list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const flatProjects = list.flatMap((d) => d.projects);
  return {
    source: kwentra.isConfigured() ? 'kwentra+cms' : 'cms',
    destinations: list,
    projects: homeOnly ? flatProjects.filter((p) => p.showOnHome !== false) : flatProjects,
    errors: [],
    needFromKwentra: null,
  };
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
        unitType: overlay.unitType || '',
        brand: overlay.brand || '',
        compoundId: overlay.compoundId || '',
        compound: overlay.compound || '',
        destinationId: overlay.destinationId || '',
        destination: overlay.destination || overlay.region || '',
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

const toKwentraTime = (hhmm, fallback) => (hhmm ? `${hhmm}:00` : fallback);

/**
 * Build reservation body shaped like Kwentra Reservation API docs from a website booking.
 * Carries every PMS data field (see lib/pms.js) — typed fields where Kwentra has them,
 * the full PMS record under `website_booking` so nothing is lost.
 */
function buildReservationPayload({
  booking,
  listing,
  guestProfileId,
  rateId,
  boardTypeId,
  sourceId,
  channelId,
  guaranteeType,
}) {
  const roomTypeId = Number(listing?.kwentraRoomTypeId) || listing?.kwentraRoomTypeId;
  const nameParts = String(booking.primaryGuestName || '').trim().split(/\s+/);
  const first_name = nameParts[0] || 'Guest';
  const last_name = nameParts.slice(1).join(' ') || first_name;
  const remarks = [
    booking.notes || '',
    booking.otherGuestNames?.length ? `Other guests: ${booking.otherGuestNames.join(', ')}` : '',
    `Rate plan: ${booking.ratePlanName}`,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    arrival_date: booking.arrivalDate,
    departure_date: booking.departureDate,
    nights: booking.nights,
    check_in_time: toKwentraTime(booking.checkInTime, process.env.KWENTRA_DEFAULT_CHECKIN || '15:00:00'),
    check_out_time: toKwentraTime(booking.checkOutTime, process.env.KWENTRA_DEFAULT_CHECKOUT || '12:00:00'),
    voucher_no: booking.voucherNumber,
    remarks,
    purpose_of_stay: '1',
    reservation_mode: 'daily',
    hold_status: 'CONFIRMED',
    reservation_confirmation: 'Confirmed',
    guarantee_type: guaranteeType != null ? Number(guaranteeType) : Number(process.env.KWENTRA_GUARANTEE_TYPE || 3),
    source: sourceId != null ? { id: Number(sourceId) } : process.env.KWENTRA_SOURCE_ID
      ? { id: Number(process.env.KWENTRA_SOURCE_ID) }
      : undefined,
    channel: channelId != null ? { id: Number(channelId), name: booking.channel } : process.env.KWENTRA_CHANNEL_ID
      ? { id: Number(process.env.KWENTRA_CHANNEL_ID), name: booking.channel }
      : { name: booking.channel },
    reservation_country: booking.reservationCountry,
    nationality: booking.nationality || undefined,
    name: guestProfileId
      ? { id: Number(guestProfileId) || guestProfileId, first_name, last_name, name: `${first_name} ${last_name}` }
      : {
          first_name,
          last_name,
          name: `${first_name} ${last_name}`,
          email: booking.email,
          mobile: booking.phone,
          nationality: booking.nationality || undefined,
        },
    room_nights: [
      {
        room_type: { id: roomTypeId, name: booking.roomType },
        actual_room_type: { id: roomTypeId },
        rate: rateId != null ? { id: Number(rateId), name: booking.ratePlanName } : process.env.KWENTRA_DEFAULT_RATE_ID
          ? { id: Number(process.env.KWENTRA_DEFAULT_RATE_ID), name: booking.ratePlanName }
          : { name: booking.ratePlanName },
        board_type: boardTypeId != null ? { id: Number(boardTypeId) } : process.env.KWENTRA_DEFAULT_BOARD_TYPE_ID
          ? { id: Number(process.env.KWENTRA_DEFAULT_BOARD_TYPE_ID) }
          : undefined,
        currency: process.env.KWENTRA_CURRENCY_ID
          ? { id: Number(process.env.KWENTRA_CURRENCY_ID), code: booking.rateCurrency }
          : { code: booking.rateCurrency },
        rate_amount: booking.averageNightlyRate,
        from_date: booking.arrivalDate,
        // Kwentra room_nights.to_date is last night (departure - 1 day) in their examples
        to_date: checkoutMinusOne(booking.departureDate) || booking.arrivalDate,
        number_of_adults: booking.adults,
        number_of_children: booking.children,
      },
    ],
    balance: booking.rateAmount,
    website_booking: {
      primary_guest_name: booking.primaryGuestName,
      other_guests_names: booking.otherGuestNames,
      primary_guest_nationality: booking.nationality,
      arrival_date: booking.arrivalDate,
      departure_date: booking.departureDate,
      nights: booking.nights,
      check_in_time: booking.checkInTime || null,
      check_out_time: booking.checkOutTime || null,
      reservation_country: booking.reservationCountry,
      channel: booking.channel,
      voucher_number: booking.voucherNumber,
      adults: booking.adults,
      children: booking.children,
      destination: booking.destination,
      property: booking.property,
      room_type_booked: booking.roomType,
      rate_plan_name: booking.ratePlanName,
      rate_amount: booking.rateAmount,
      rate_currency: booking.rateCurrency,
      email: booking.email,
      phone: booking.phone,
      listing_slug: listing?.slug,
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

/**
 * PULL physical rooms (unit numbers + floors), grouped by room type id.
 */
async function pullRooms() {
  const path = roomsPath();
  try {
    const data = await kwentra.kwentraFetch(path, { query: { page_size: 1000 } });
    const byType = new Map();
    for (const room of extractList(data, 'rooms', 'items', 'data').map(normalizeRoom)) {
      if (!room.roomTypeId || !room.number) continue;
      if (!byType.has(room.roomTypeId)) byType.set(room.roomTypeId, { unitNumbers: [], floors: new Set() });
      const entry = byType.get(room.roomTypeId);
      entry.unitNumbers.push(room.number);
      if (room.floor) entry.floors.add(String(room.floor));
    }
    return { ok: true, path, byType };
  } catch (err) {
    err.hint = 'Ask Kwentra for the Rooms list API (room number, floor, room type) and set KWENTRA_PATH_ROOMS.';
    throw err;
  }
}

/* ——— Persisted sync: Kwentra → CMS store ——— */

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const PROPERTY_PMS_FIELDS = [
  'name',
  'description',
  'city',
  'address',
  'buildingNumber',
  'phone',
  'mapsUrl',
  'latitude',
  'longitude',
  'facilities',
];

const UNIT_PMS_FIELDS = [
  'title',
  'description',
  'propertyType',
  'bedrooms',
  'bathrooms',
  'maxGuests',
  'areaSqm',
  'amenities',
  'pricePerNight',
  'currency',
  'roomCount',
  'unitNumbers',
  'floor',
  'bedType',
];

/**
 * Take a PMS value only when it changed in Kwentra since the last sync (tracked in kwentraSnapshot),
 * so edits made in the admin survive even if pushing them to Kwentra failed.
 */
function mergeFromPms(current, incoming, keys) {
  const snapshot = current?.kwentraSnapshot || {};
  const nextSnapshot = { ...snapshot };
  const patch = {};
  for (const key of keys) {
    const value = incoming[key];
    if (isEmpty(value)) continue;
    nextSnapshot[key] = value;
    if (same(snapshot[key], value)) continue;
    if (!same(current?.[key], value)) patch[key] = value;
  }
  if (!same(snapshot, nextSnapshot)) patch.kwentraSnapshot = nextSnapshot;
  return patch;
}

function pick(obj, keys) {
  return Object.fromEntries(keys.filter((k) => !isEmpty(obj[k])).map((k) => [k, obj[k]]));
}

const syncState = { running: false, last: null, timer: null };

async function syncFromKwentra() {
  if (!kwentra.isConfigured()) {
    return { ok: false, reason: 'not_configured', message: 'Kwentra credentials are not set in Server/.env' };
  }
  if (syncState.running) return { ok: false, reason: 'already_running', message: 'A sync is already running' };
  syncState.running = true;
  const startedAt = new Date().toISOString();
  const report = {
    ok: true,
    startedAt,
    finishedAt: null,
    destinations: { created: 0, updated: 0 },
    properties: { created: 0, updated: 0 },
    units: { created: 0, updated: 0, unchanged: 0 },
    errors: [],
    needFromKwentra: [],
  };
  const fail = (kind, err) => {
    report.errors.push({ kind, message: err.message });
    if (err.hint) report.needFromKwentra.push(err.hint);
  };

  try {
    const [destRes, projRes, typeRes, roomRes] = await Promise.allSettled([
      pullDestinations(),
      pullProjects(),
      pullRoomTypesRaw(),
      pullRooms(),
    ]);
    const kwDestinations = destRes.status === 'fulfilled' ? destRes.value.items || [] : (fail('destinations', destRes.reason), []);
    const kwProjects = projRes.status === 'fulfilled' ? projRes.value.items || [] : (fail('properties', projRes.reason), []);
    const kwTypes =
      typeRes.status === 'fulfilled'
        ? (typeRes.value.items || []).map(normalizeRoomType).filter((u) => u.kwentraRoomTypeId)
        : (fail('unit types', typeRes.reason), []);
    const roomsByType = roomRes.status === 'fulfilled' ? roomRes.value.byType : (fail('rooms', roomRes.reason), new Map());

    // Destinations — create missing, link by Kwentra id, never overwrite website names/images
    let destinations = await listCmsDestinations();
    for (const d of kwDestinations) {
      const found =
        destinations.find((x) => x.kwentraDestinationId && x.kwentraDestinationId === d.kwentraDestinationId) ||
        destinations.find((x) => norm(x.name) === norm(d.name));
      if (!found) {
        await createDestination({
          id: slugify(d.name) || `dest-${d.kwentraDestinationId}`,
          name: d.name,
          description: d.description,
          kwentraDestinationId: d.kwentraDestinationId,
        });
        report.destinations.created += 1;
      } else {
        const patch = {};
        if (!found.kwentraDestinationId) patch.kwentraDestinationId = d.kwentraDestinationId;
        if (!found.description && d.description) patch.description = d.description;
        if (Object.keys(patch).length) {
          await updateDestination(found.id, patch);
          report.destinations.updated += 1;
        }
      }
    }
    destinations = await listCmsDestinations();

    // Properties
    let compounds = await listCmsCompounds();
    for (const p of kwProjects) {
      const incoming = { ...p };
      if (isEmpty(incoming.latitude) && incoming.mapsUrl) Object.assign(incoming, coordsFromMapsUrl(incoming.mapsUrl) || {});
      const found =
        compounds.find((c) => c.kwentraProjectId && c.kwentraProjectId === p.kwentraProjectId) ||
        compounds.find((c) => norm(c.name) === norm(p.name));
      const dest = destinations.find((d) => d.kwentraDestinationId && d.kwentraDestinationId === p.kwentraDestinationId);
      if (!found) {
        const fields = pick(incoming, PROPERTY_PMS_FIELDS);
        await createCompound({
          ...fields,
          id: slugify(p.name) || `proj-${p.kwentraProjectId}`,
          destinationId: dest?.id || '',
          kwentraProjectId: p.kwentraProjectId,
          kwentraDestinationId: p.kwentraDestinationId,
          kwentraSnapshot: fields,
        });
        report.properties.created += 1;
      } else {
        const patch = mergeFromPms(found, incoming, PROPERTY_PMS_FIELDS);
        if (!found.kwentraProjectId) patch.kwentraProjectId = p.kwentraProjectId;
        if (!found.kwentraDestinationId && p.kwentraDestinationId) patch.kwentraDestinationId = p.kwentraDestinationId;
        if (!found.destinationId && dest) patch.destinationId = dest.id;
        if (Object.keys(patch).length) {
          await updateCompound(found.id, patch);
          report.properties.updated += 1;
        }
      }
    }
    compounds = await listCmsCompounds();

    // Unit types
    const units = await listCmsUnits();
    const slugs = new Set(units.map((u) => u.slug));
    for (const t of kwTypes) {
      const rooms = roomsByType.get(t.kwentraRoomTypeId);
      const incoming = { ...t };
      if (rooms) {
        incoming.unitNumbers = rooms.unitNumbers;
        incoming.roomCount = rooms.unitNumbers.length;
        if (!incoming.floor && rooms.floors.size) incoming.floor = [...rooms.floors].join(', ');
      }
      const compound = compounds.find((c) => c.kwentraProjectId && c.kwentraProjectId === t.kwentraProjectId);
      const found =
        units.find((u) => u.kwentraRoomTypeId && String(u.kwentraRoomTypeId) === t.kwentraRoomTypeId) ||
        (compound && units.find((u) => u.compoundId === compound.id && !u.kwentraRoomTypeId && norm(u.title) === norm(t.title)));

      if (!found) {
        const fields = pick(incoming, UNIT_PMS_FIELDS);
        let slug = slugify(`${compound?.name || ''} ${t.title}`) || `room-type-${t.kwentraRoomTypeId}`;
        for (let n = 2; slugs.has(slug); n += 1) slug = `${slugify(`${compound?.name || ''} ${t.title}`)}-${n}`;
        slugs.add(slug);
        await createUnit({
          ...fields,
          slug,
          compoundId: compound?.id || '',
          images: compound?.image ? [compound.image] : [],
          driveFolderUrl: compound?.driveFolderUrl || '',
          kwentraRoomTypeId: t.kwentraRoomTypeId,
          kwentraSnapshot: fields,
          published: true,
        });
        report.units.created += 1;
        continue;
      }

      const patch = mergeFromPms(found, incoming, UNIT_PMS_FIELDS);
      if (!found.kwentraRoomTypeId) patch.kwentraRoomTypeId = t.kwentraRoomTypeId;
      if (!found.compoundId && compound) patch.compoundId = compound.id;
      if (Object.keys(patch).length) {
        await updateUnit(found.id, patch);
        report.units.updated += 1;
      } else {
        report.units.unchanged += 1;
      }
    }
  } catch (err) {
    report.ok = false;
    fail('sync', err);
  } finally {
    report.finishedAt = new Date().toISOString();
    report.needFromKwentra = [...new Set(report.needFromKwentra)];
    syncState.last = report;
    syncState.running = false;
    console.log(
      `[kwentra-sync] ${report.ok ? 'done' : 'failed'} — units +${report.units.created} ~${report.units.updated}, properties +${report.properties.created} ~${report.properties.updated}${report.errors.length ? `, ${report.errors.length} error(s)` : ''}`
    );
  }
  return report;
}

function syncMinutes() {
  const n = Number(process.env.KWENTRA_SYNC_MINUTES ?? 30);
  return Number.isFinite(n) && n >= 0 ? n : 30;
}

function syncStatus() {
  return {
    configured: kwentra.isConfigured(),
    running: syncState.running,
    autoSyncMinutes: kwentra.isConfigured() ? syncMinutes() : 0,
    last: syncState.last,
    paths: {
      destinations: destinationsPath(),
      properties: projectsPath(),
      unitTypes: roomTypesPath(),
      rooms: roomsPath(),
    },
  };
}

/** Sync once at boot, then every KWENTRA_SYNC_MINUTES (0 = only manual syncs). */
function startAutoSync() {
  if (!kwentra.isConfigured() || syncState.timer) return;
  const run = () => syncFromKwentra().catch((err) => console.warn('[kwentra-sync]', err.message));
  setTimeout(run, 5_000).unref?.();
  const minutes = syncMinutes();
  if (minutes > 0) {
    syncState.timer = setInterval(run, minutes * 60_000);
    syncState.timer.unref?.();
  }
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
  normalizeRoom,
  pullRooms,
  publicProperty,
  syncFromKwentra,
  syncStatus,
  startAutoSync,
};
