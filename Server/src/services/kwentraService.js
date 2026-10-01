/**
 * Kwentra PMS — headless wrapper aligned to:
 * "Kwentra's Reservation & Guest Profile APIs"
 *
 * Documented endpoints:
 *  - GET  /api/reservation/individualreservation/v2  (list/filter reservations)
 *  - GET  /api/core/individualprofile/v3/:id
 *  - PUT  /api/core/individualprofile/v3/:id/
 *  - POST /api/core/individualprofile/v3/:id/attachments
 *
 * Auth: HTTP Basic (username:password) + tenant_id query param
 * Base: https://manage.kwentra.com
 *
 * Guest browser NEVER calls these — only our Node gateway does.
 */

const DEFAULT_BASE = 'https://manage.kwentra.com';
const DEFAULT_TIMEOUT_MS = 30_000;

const RESERVATION_INCLUDES = [
  'name.first_name',
  'name.last_name',
  'name.name',
  'name.guest_preferences',
  'check_in_time',
  'check_out_time',
  'channel.name',
  'country',
  'market',
  'source',
  'group_reservation.name',
  'group_reservation.confirmation_number',
  'state.name',
  'current_room_night.room_number',
  'current_room_night.actual_room_type.room_type',
  'current_room_night.number_of_adults',
  'current_room_night.number_of_children',
  'room_nights.board_type.description',
];

const PROFILE_INCLUDES = [
  'name',
  'nationality_object.name',
  'email',
  'telephone',
  'mobile',
  'id',
  'passport',
  'first_name',
  'last_name',
  'document_type.name',
  'issue_date',
  'issue_place',
  'work_phone',
  'driving_license_number',
  'old_id',
  'ID_number',
  'occupation',
  'individualprofilecontactinfo_set.city',
  'individualprofilecontactinfo_set.country.name',
  'guest_preferences',
];

/** States that occupy inventory for calendar blocking */
const BLOCKING_STATES = new Set(['Expected', 'Checked In']);

function isConfigured() {
  return Boolean(
    (process.env.KWENTRA_USERNAME && process.env.KWENTRA_PASSWORD) ||
      process.env.KWENTRA_BASIC_TOKEN ||
      process.env.KWENTRA_API_KEY
  );
}

function getTenantId() {
  return (
    process.env.KWENTRA_TENANT_ID ||
    process.env.KWENTRA_PROPERTY_ID ||
    ''
  );
}

function baseUrl() {
  return String(process.env.KWENTRA_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}

function basicAuthHeader() {
  if (process.env.KWENTRA_BASIC_TOKEN) {
    const token = process.env.KWENTRA_BASIC_TOKEN;
    return token.startsWith('Basic ') ? token : `Basic ${token}`;
  }
  if (process.env.KWENTRA_USERNAME && process.env.KWENTRA_PASSWORD) {
    const raw = `${process.env.KWENTRA_USERNAME}:${process.env.KWENTRA_PASSWORD}`;
    return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
  }
  // Legacy fallback if someone set a pre-encoded key
  if (process.env.KWENTRA_API_KEY) {
    const key = process.env.KWENTRA_API_KEY;
    return key.startsWith('Basic ') ? key : `Basic ${key}`;
  }
  return null;
}

function appendIncludes(url, includes) {
  for (const field of includes) {
    url.searchParams.append('include[]', field);
  }
}

async function kwentraFetch(path, { method = 'GET', query, body, formData } = {}) {
  if (!isConfigured()) {
    const err = new Error(
      'Kwentra is not configured. Set KWENTRA_USERNAME + KWENTRA_PASSWORD (or KWENTRA_BASIC_TOKEN) and KWENTRA_TENANT_ID.'
    );
    err.status = 503;
    err.code = 'KWENTRA_NOT_CONFIGURED';
    throw err;
  }

  const url = new URL(path.startsWith('http') ? path : `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`);
  const tenantId = getTenantId();
  if (tenantId && !url.searchParams.has('tenant_id')) {
    url.searchParams.set('tenant_id', tenantId);
  }
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v)) {
        v.forEach((item) => url.searchParams.append(k, String(item)));
      } else {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const headers = {
    Accept: 'application/json, text/plain, */*',
    Authorization: basicAuthHeader(),
  };
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || `Kwentra ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function extractReservations(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.results?.reservations)) return payload.results.reservations;
  if (Array.isArray(payload.reservations)) return payload.reservations;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

/**
 * GET /api/reservation/individualreservation/v2
 */
async function listReservations({
  arrivalGte,
  arrivalLte,
  stateRegex = 'Checked In|Checked Out|No Show|Expected|Canceled',
  sort = '-id',
  includes = RESERVATION_INCLUDES,
  extraQuery = {},
} = {}) {
  const url = new URL(`${baseUrl()}/api/reservation/individualreservation/v2`);
  url.searchParams.set('tenant_id', getTenantId());
  appendIncludes(url, includes);
  if (sort) url.searchParams.append('sort[]', sort);
  if (stateRegex) url.searchParams.set('filter{state.name.regex}', stateRegex);
  if (arrivalGte) url.searchParams.set('filter{arrival_date.gte}', arrivalGte);
  if (arrivalLte) url.searchParams.set('filter{arrival_date.lte}', arrivalLte);
  Object.entries(extraQuery).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });

  const data = await kwentraFetch(url.toString());
  const reservations = extractReservations(data);
  return {
    count: data.count ?? reservations.length,
    next: data.next ?? null,
    previous: data.previous ?? null,
    reservations,
    raw: data,
  };
}

/**
 * GET /api/core/individualprofile/v3/:id
 */
async function getGuestProfile(profileId, includes = PROFILE_INCLUDES) {
  const url = new URL(`${baseUrl()}/api/core/individualprofile/v3/${encodeURIComponent(profileId)}`);
  url.searchParams.set('tenant_id', getTenantId());
  appendIncludes(url, includes);
  const data = await kwentraFetch(url.toString());
  return data.individual_profile || data;
}

/**
 * PUT /api/core/individualprofile/v3/:id/
 * Docs: include all fields from GET for data integrity.
 */
async function updateGuestProfile(profileId, body) {
  const path = `/api/core/individualprofile/v3/${encodeURIComponent(profileId)}/`;
  const data = await kwentraFetch(path, { method: 'PUT', body });
  return data.individual_profile || data;
}

/**
 * Convenience: GET profile → merge patch → PUT full body (documented edit flow).
 */
async function patchGuestProfile(profileId, patch = {}) {
  const current = await getGuestProfile(profileId);
  const next = {
    first_name: current.first_name,
    last_name: current.last_name,
    date_of_birth: current.date_of_birth,
    language: current.language,
    gender: current.gender,
    nationality_object: current.nationality_object?.id || current.nationality || null,
    guest_preferences: current.guest_preferences,
    letter_greeting: current.letter_greeting,
    place_of_birth: current.place_of_birth || '',
    company: current.company,
    occupation: current.occupation,
    old_id: current.old_id,
    loyalty_points: current.loyalty_points ?? null,
    document_type: current.document_type || '',
    ID_number: current.ID_number,
    issue_place: current.issue_place,
    issue_date: current.issue_date,
    expiry_date: current.expiry_date,
    passport: current.passport,
    driving_license_number: current.driving_license_number,
    email: current.email,
    mobile: current.mobile,
    telephone: current.telephone || '',
    work_phone: current.work_phone,
    keep_email: current.keep_email ?? false,
    email_third_party: current.email_third_party ?? false,
    keep_personal_info: current.keep_personal_info ?? false,
    individualprofilecontactinfo_set: current.individualprofilecontactinfo_set || [],
    attachments: current.attachments ?? null,
    ...patch,
  };
  return updateGuestProfile(profileId, next);
}

/**
 * Build Individual Profile v3 body from website guest form fields.
 */
function splitName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  const first_name = parts[0] || 'Guest';
  const last_name = parts.slice(1).join(' ') || first_name;
  return { first_name, last_name, name: parts.join(' ') || first_name };
}

function buildProfilePayloadFromGuest({
  name,
  email,
  phone,
  notes,
  nationality = 'EG',
  address = '',
  city = '',
} = {}) {
  const { first_name, last_name } = splitName(name);
  return {
    first_name,
    last_name,
    date_of_birth: null,
    language: null,
    gender: null,
    nationality_object: nationality,
    guest_preferences: notes || '',
    letter_greeting: null,
    place_of_birth: '',
    company: null,
    occupation: null,
    old_id: null,
    loyalty_points: null,
    document_type: '',
    ID_number: null,
    issue_place: null,
    issue_date: null,
    expiry_date: null,
    passport: null,
    driving_license_number: null,
    email: email || '',
    mobile: phone || '',
    telephone: '',
    work_phone: null,
    keep_email: false,
    email_third_party: false,
    keep_personal_info: false,
    individualprofilecontactinfo_set: [
      {
        address: address || '',
        city: city || '',
        country: {
          id: nationality,
          iso: nationality,
          name: nationality === 'EG' ? 'EGYPT' : nationality,
        },
        zip_code: '',
        po_box: '',
        contact_type: {
          id: 1,
          description: 'Main',
        },
      },
    ],
    attachments: null,
  };
}

/**
 * POST /api/core/individualprofile/v3/ — create guest from website form.
 * (Create is the natural write path for new guests; PUT is for edits per docs.)
 */
async function createGuestProfile(guest) {
  const body = buildProfilePayloadFromGuest(guest);
  const path = process.env.KWENTRA_PATH_CREATE_PROFILE || '/api/core/individualprofile/v3/';
  const data = await kwentraFetch(path, { method: 'POST', body });
  return data.individual_profile || data;
}

/**
 * Website → Kwentra: push guest-filled details.
 * - If profileId provided → GET + PUT (documented edit flow)
 * - Else → POST create new Individual Profile
 */
async function sendGuestFromWebsite(guest = {}) {
  const { profileId, name, email, phone, notes, nationality, address, city } = guest;
  if (!name || !email) {
    const err = new Error('name and email are required to send guest to Kwentra');
    err.status = 400;
    throw err;
  }

  if (profileId) {
    const patch = {
      ...splitName(name),
      email,
      mobile: phone || '',
      guest_preferences: notes || '',
    };
    if (nationality) patch.nationality_object = nationality;
    const profile = await patchGuestProfile(profileId, patch);
    return { action: 'updated', profile };
  }

  const profile = await createGuestProfile({
    name,
    email,
    phone,
    notes,
    nationality,
    address,
    city,
  });
  return { action: 'created', profile };
}

/**
 * POST /api/core/individualprofile/v3/:id/attachments (multipart)
 */
async function uploadGuestAttachment(profileId, fileBuffer, filename, contentType = 'application/octet-stream') {
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: contentType }), filename);
  const path = `/api/core/individualprofile/v3/${encodeURIComponent(profileId)}/attachments`;
  return kwentraFetch(path, { method: 'POST', formData: form });
}

function roomTypeIdFromReservation(res) {
  return (
    res?.current_room_night?.actual_room_type?.id ||
    res?.current_room_night?.room_type?.id ||
    res?.room_nights?.[0]?.actual_room_type?.id ||
    res?.room_nights?.[0]?.room_type?.id ||
    null
  );
}

function eachNightIso(arrival, departure, fn) {
  if (!arrival || !departure) return;
  const start = new Date(`${arrival}T00:00:00`);
  const end = new Date(`${departure}T00:00:00`);
  for (let t = +start; t < +end; t += 86_400_000) {
    const d = new Date(t);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fn(iso, d);
  }
}

/**
 * Build calendar blocked nights from Kwentra reservations for a room type.
 * (This doc set has no dedicated availability endpoint — we derive from reservations.)
 */
async function getAvailability(roomTypeId, { from, to } = {}) {
  const padFrom = from
    ? (() => {
        const d = new Date(`${from}T00:00:00`);
        d.setDate(d.getDate() - 45);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })()
    : undefined;

  const { reservations } = await listReservations({
    arrivalGte: padFrom || from,
    arrivalLte: to,
    stateRegex: 'Checked In|Expected|No Show|Checked Out|Canceled',
  });

  const blockedSet = new Set();
  const checkoutSet = new Set();
  const matched = [];

  for (const res of reservations) {
    const stateName = res?.state?.name || '';
    if (!BLOCKING_STATES.has(stateName)) continue;
    if (roomTypeId != null && roomTypeId !== '') {
      const rt = roomTypeIdFromReservation(res);
      if (rt != null && String(rt) !== String(roomTypeId)) continue;
    }
    matched.push(res);
    const arrival = res.arrival_date;
    const departure = res.departure_date;
    eachNightIso(arrival, departure, (iso) => blockedSet.add(iso));
    if (departure) checkoutSet.add(departure);
  }

  return {
    blocked: [...blockedSet].sort(),
    checkoutDates: [...checkoutSet].sort(),
    prices: {},
    currency: 'EGP',
    roomTypeId: roomTypeId || null,
    reservationCount: matched.length,
    source: 'kwentra-reservations',
  };
}

function normalizeAvailability(raw = {}) {
  return {
    blocked: raw.blocked || [],
    checkoutDates: raw.checkoutDates || raw.checkout_dates || [],
    prices: raw.prices || {},
    currency: raw.currency || 'EGP',
    raw,
  };
}

/**
 * Create reservation is NOT documented in the provided Word file.
 * Hook remains for when Kwentra issues the write API; until then callers get a clear error.
 */
async function createReservation(_payload) {
  if (process.env.KWENTRA_PATH_CREATE_RESERVATION) {
    return kwentraFetch(process.env.KWENTRA_PATH_CREATE_RESERVATION, {
      method: 'POST',
      body: _payload,
    });
  }
  const err = new Error(
    'Kwentra create-reservation is not in the provided Reservation & Guest Profile docs. Set KWENTRA_PATH_CREATE_RESERVATION when you receive that endpoint, or keep local holds + sync guest profiles via individualprofile/v3.'
  );
  err.status = 501;
  err.code = 'KWENTRA_CREATE_NOT_DOCUMENTED';
  throw err;
}

async function confirmReservation(_id, _meta) {
  const err = new Error(
    'Kwentra confirm-reservation is not documented in the provided API pack. Wire KWENTRA_PATH_CONFIRM when available.'
  );
  err.status = 501;
  err.code = 'KWENTRA_CONFIRM_NOT_DOCUMENTED';
  throw err;
}

async function cancelReservation(_id, _reason) {
  const err = new Error('Kwentra cancel-reservation is not documented in the provided API pack.');
  err.status = 501;
  err.code = 'KWENTRA_CANCEL_NOT_DOCUMENTED';
  throw err;
}

/** Alias used by older controller code */
async function listUnits() {
  return {
    items: [],
    message:
      'Unit catalog is managed in Prime CMS. Map each unit’s kwentraRoomTypeId to Kwentra room_type ids for availability.',
  };
}

async function getUnit(id) {
  return { id, message: 'Use CMS listing + kwentraRoomTypeId' };
}

async function quoteStay() {
  const err = new Error('Kwentra quote API is not in the provided docs — quoting uses CMS/mock rates.');
  err.status = 501;
  err.code = 'KWENTRA_QUOTE_NOT_DOCUMENTED';
  throw err;
}

module.exports = {
  isConfigured,
  getTenantId,
  baseUrl,
  kwentraFetch,
  listReservations,
  getGuestProfile,
  updateGuestProfile,
  patchGuestProfile,
  createGuestProfile,
  sendGuestFromWebsite,
  buildProfilePayloadFromGuest,
  uploadGuestAttachment,
  getAvailability,
  normalizeAvailability,
  createReservation,
  confirmReservation,
  cancelReservation,
  listUnits,
  getUnit,
  quoteStay,
  RESERVATION_INCLUDES,
  PROFILE_INCLUDES,
  BLOCKING_STATES,
};
