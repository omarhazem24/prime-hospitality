/**
 * CMS data access — Supabase when configured, otherwise local JSON (dev fallback).
 */
const { isSupabaseConfigured } = require('../config/supabase');
const json = require('./jsonCms');
const sb = require('./supabaseCms');

function backend() {
  return isSupabaseConfigured() ? sb : json;
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
  getDashboard: (...args) => backend().getDashboard(...args),
  getPublicUnits: (...args) => backend().getPublicUnits(...args),
  getPublicCompounds: (...args) => backend().getPublicCompounds(...args),
  getSlideshow: (...args) => backend().getSlideshow(...args),
  getSettings: (...args) => backend().getSettings(...args),
  getContent: (...args) => backend().getContent(...args),
  findUnit: (...args) => backend().findUnit(...args),
  findCompound: (...args) => backend().findCompound(...args),
  listCompounds: (...args) => backend().listCompounds(...args),
  listUnits: (...args) => backend().listUnits(...args),
  listSlides: (...args) => backend().listSlides(...args),
  createSlide: (...args) => backend().createSlide(...args),
  updateSlide: (...args) => backend().updateSlide(...args),
  deleteSlide: (...args) => backend().deleteSlide(...args),
  reorderSlides: (...args) => backend().reorderSlides(...args),
  createCompound: (...args) => backend().createCompound(...args),
  updateCompound: (...args) => backend().updateCompound(...args),
  deleteCompound: (...args) => backend().deleteCompound(...args),
  reorderCompounds: (...args) => backend().reorderCompounds(...args),
  createUnit: (...args) => backend().createUnit(...args),
  updateUnit: (...args) => backend().updateUnit(...args),
  deleteUnit: (...args) => backend().deleteUnit(...args),
  reorderHomeUnits: (...args) => backend().reorderHomeUnits(...args),
  reorderSearchUnits: (...args) => backend().reorderSearchUnits(...args),
  saveSettings: (...args) => backend().saveSettings(...args),
  createBooking: (...args) => backend().createBooking(...args),
  listBookings: (...args) => backend().listBookings(...args),
  findBooking: (...args) => backend().findBooking(...args),
  findGuestByEmail: (...args) => backend().findGuestByEmail(...args),
  createGuest: (...args) => backend().createGuest(...args),
  findGuestById: (...args) => backend().findGuestById(...args),
};
