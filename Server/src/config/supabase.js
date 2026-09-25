const { createClient } = require('@supabase/supabase-js');

function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

let client;

function getSupabase() {
  if (!isSupabaseConfigured()) {
    const err = new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Server/.env'
    );
    err.status = 503;
    throw err;
  }
  if (!client) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    client = createClient(process.env.SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

module.exports = { getSupabase, isSupabaseConfigured };
