/**
 * Guest + Admin API client — talks to Prime Server (/api).
 */

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const ADMIN_TOKEN_KEY = 'prime_admin_token';

function buildUrl(path, params) {
  const url = new URL(path, BASE || window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return BASE ? url.toString() : `${url.pathname}${url.search}`;
}

async function request(path, { method = 'GET', params, body, token, formData } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';
  const auth = token || localStorage.getItem('prime_guest_token');
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function adminRequest(path, options = {}) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return request(path, { ...options, token });
}

export const api = {
  getHealth() {
    return request('/api/health');
  },

  getListings(params = {}) {
    return request('/api/units', { params });
  },

  getListingBySlug(slug) {
    return request(`/api/units/${encodeURIComponent(slug)}`);
  },

  getListingAvailability(slug, params = {}) {
    return request(`/api/units/${encodeURIComponent(slug)}/availability`, { params });
  },

  getListingPricing(slug, params = {}) {
    return request(`/api/units/${encodeURIComponent(slug)}/pricing`, { params });
  },

  getCompounds(params = {}) {
    return request('/api/compounds', { params });
  },

  getDestinations(params = {}) {
    return request('/api/destinations', { params });
  },

  getDestinationById(id) {
    return request(`/api/destinations/${encodeURIComponent(id)}`);
  },

  getMeta() {
    return request('/api/content/meta');
  },

  getPartners() {
    return request('/api/content/partners');
  },

  getTrust() {
    return request('/api/content/trust');
  },

  getFaqs() {
    return request('/api/content/faqs');
  },

  getSlideshow() {
    return request('/api/content/slideshow');
  },

  getPixels() {
    return request('/api/content/pixels');
  },

  async getFeatured(limit = 8) {
    const featured = await this.getListings({ featured: true, limit });
    if (featured.items?.length) return featured;
    return this.getListings({ limit });
  },

  createBooking(payload) {
    return request('/api/bookings', { method: 'POST', body: payload });
  },

  sendContact(payload) {
    return request('/api/inquiries/contact', { method: 'POST', body: payload });
  },

  sendPartnerInquiry(payload) {
    return request('/api/inquiries/partner', { method: 'POST', body: payload });
  },

  signIn(payload) {
    return request('/api/auth/sign-in', { method: 'POST', body: payload });
  },

  signUp(payload) {
    return request('/api/auth/sign-up', { method: 'POST', body: payload });
  },

  me() {
    return request('/api/auth/me');
  },

  /* ——— Admin ——— */
  adminLogin(payload) {
    return request('/api/admin/auth/login', { method: 'POST', body: payload });
  },

  adminMe() {
    return adminRequest('/api/admin/auth/me');
  },

  adminDriveFolderImages(url) {
    return adminRequest('/api/admin/drive/folder-images', {
      method: 'POST',
      body: { url },
    });
  },

  adminDashboard() {
    return adminRequest('/api/admin/dashboard');
  },

  adminUpload(file, folder = 'site') {
    const fd = new FormData();
    fd.append('file', file);
    return adminRequest(`/api/admin/upload?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      formData: fd,
    });
  },

  adminGetSlideshow() {
    return adminRequest('/api/admin/slideshow');
  },
  adminCreateSlide(body) {
    return adminRequest('/api/admin/slideshow', { method: 'POST', body });
  },
  adminUpdateSlide(id, body) {
    return adminRequest(`/api/admin/slideshow/${id}`, { method: 'PATCH', body });
  },
  adminDeleteSlide(id) {
    return adminRequest(`/api/admin/slideshow/${id}`, { method: 'DELETE' });
  },
  adminReorderSlideshow(ids) {
    return adminRequest('/api/admin/slideshow/reorder', { method: 'PATCH', body: { ids } });
  },

  adminGetCompounds() {
    return adminRequest('/api/admin/compounds');
  },
  adminCreateCompound(body) {
    return adminRequest('/api/admin/compounds', { method: 'POST', body });
  },
  adminUpdateCompound(id, body) {
    return adminRequest(`/api/admin/compounds/${id}`, { method: 'PATCH', body });
  },
  adminDeleteCompound(id) {
    return adminRequest(`/api/admin/compounds/${id}`, { method: 'DELETE' });
  },
  adminReorderCompounds(ids) {
    return adminRequest('/api/admin/compounds/reorder', { method: 'PATCH', body: { ids } });
  },

  adminGetUnits() {
    return adminRequest('/api/admin/units');
  },
  adminCreateUnit(body) {
    return adminRequest('/api/admin/units', { method: 'POST', body });
  },
  adminUpdateUnit(id, body) {
    return adminRequest(`/api/admin/units/${id}`, { method: 'PATCH', body });
  },
  adminDeleteUnit(id) {
    return adminRequest(`/api/admin/units/${id}`, { method: 'DELETE' });
  },
  adminReorderHomeUnits(ids) {
    return adminRequest('/api/admin/units/reorder-home', { method: 'PATCH', body: { ids } });
  },
  adminReorderSearchUnits(ids) {
    return adminRequest('/api/admin/units/reorder-search', { method: 'PATCH', body: { ids } });
  },

  adminGetSettings() {
    return adminRequest('/api/admin/settings');
  },
  adminSaveSettings(body) {
    return adminRequest('/api/admin/settings', { method: 'PUT', body });
  },

  getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },
  setAdminToken(token) {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  },
};

export default api;
