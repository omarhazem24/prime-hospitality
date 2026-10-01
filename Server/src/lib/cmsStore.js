/**
 * CMS data access — Supabase when configured, otherwise local JSON (dev fallback).
 */
const { isSupabaseConfigured } = require('../config/supabase');
const json = require('./jsonCms');
const sb = require('./supabaseCms');
const { withCompleteness, isLive } = require('./unitCompleteness');

function backend() {
  return isSupabaseConfigured() ? sb : json;
}

const decorate = (unit) => withCompleteness(unit);
const decorateAll = (units) => (Array.isArray(units) ? units.map(withCompleteness) : units);

/** Guests only ever see units that are published and pass the completeness check */
async function getPublicUnits(opts = {}) {
  const units = await backend().getPublicUnits(opts);
  const list = opts.publishedOnly === false ? units : units.filter(isLive);
  return decorateAll(list);
}

async function getDashboard(...args) {
  const [dashboard, units] = await Promise.all([backend().getDashboard(...args), backend().listUnits()]);
  const checked = decorateAll(units);
  dashboard.counts = {
    ...dashboard.counts,
    publishedUnits: checked.filter((u) => u.live).length,
    incompleteUnits: checked.filter((u) => !u.completeness.complete).length,
  };
  return dashboard;
}

function usingSupabase() {
  return isSupabaseConfigured();
}

async function ensureReady() {
  if (isSupabaseConfigured()) {
    try {
      const result = await sb.seedIfEmpty();
      if (result.seeded) console.log('[prime] Seeded Supabase from mock data');
    } catch (err) {
      console.error('[prime] Supabase seed/check failed:', err.message);
      console.error('[prime] Run Server/supabase/schema.sql in the Supabase SQL editor first.');
    }
    return;
  }
  json.ensureStore();
  json.recountUnits();
  console.warn(
    '[prime] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using local JSON store. Configure Supabase for production.'
  );
}

module.exports = {
  usingSupabase,
  ensureReady,
  sortBy: (...args) => backend().sortBy(...args),
  slugify: (...args) => backend().slugify(...args),
  newId: (...args) => backend().newId(...args),
  getDashboard,
  getPublicUnits,
  getPublicCompounds: (...args) => backend().getPublicCompounds(...args),
  getPublicDestinations: (...args) => backend().getPublicDestinations(...args),
  getSlideshow: (...args) => backend().getSlideshow(...args),
  getSettings: (...args) => backend().getSettings(...args),
  getContent: (...args) => backend().getContent(...args),
  saveContent: (...args) => backend().saveContent(...args),
  getSite: (...args) => backend().getSite(...args),
  saveSite: (...args) => backend().saveSite(...args),
  findUnit: async (...args) => decorate(await backend().findUnit(...args)),
  findCompound: (...args) => backend().findCompound(...args),
  findDestination: (...args) => backend().findDestination(...args),
  listDestinations: (...args) => backend().listDestinations(...args),
  createDestination: (...args) => backend().createDestination(...args),
  updateDestination: (...args) => backend().updateDestination(...args),
  deleteDestination: (...args) => backend().deleteDestination(...args),
  reorderDestinations: (...args) => backend().reorderDestinations(...args),
  listCompounds: (...args) => backend().listCompounds(...args),
  listUnits: async (...args) => decorateAll(await backend().listUnits(...args)),
  listSlides: (...args) => backend().listSlides(...args),
  createSlide: (...args) => backend().createSlide(...args),
  updateSlide: (...args) => backend().updateSlide(...args),
  deleteSlide: (...args) => backend().deleteSlide(...args),
  reorderSlides: (...args) => backend().reorderSlides(...args),
  createCompound: (...args) => backend().createCompound(...args),
  updateCompound: (...args) => backend().updateCompound(...args),
  deleteCompound: (...args) => backend().deleteCompound(...args),
  reorderCompounds: (...args) => backend().reorderCompounds(...args),
  createUnit: async (...args) => decorate(await backend().createUnit(...args)),
  updateUnit: async (...args) => decorate(await backend().updateUnit(...args)),
  deleteUnit: async (...args) => decorateAll(await backend().deleteUnit(...args)),
  reorderHomeUnits: async (...args) => decorateAll(await backend().reorderHomeUnits(...args)),
  reorderSearchUnits: async (...args) => decorateAll(await backend().reorderSearchUnits(...args)),
  saveSettings: (...args) => backend().saveSettings(...args),
  nextVoucherSerial: (...args) => backend().nextVoucherSerial(...args),
  createBooking: (...args) => backend().createBooking(...args),
  updateBooking: (...args) => backend().updateBooking(...args),
  listBookings: (...args) => backend().listBookings(...args),
  findBooking: (...args) => backend().findBooking(...args),
};
