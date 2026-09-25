/**
 * Seed Supabase from mock data (idempotent — only inserts when compounds table is empty).
 * Usage: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { isSupabaseConfigured } = require('../config/supabase');
const { seedIfEmpty } = require('../lib/supabaseCms');

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Server/.env first.');
    process.exit(1);
  }
  console.log('Checking Supabase…');
  const result = await seedIfEmpty();
  console.log(result.seeded ? 'Seeded compounds, units, slideshow, and settings.' : 'Already has data — skipped.');
}

main().catch((err) => {
  console.error(err.message || err);
  console.error('Make sure you ran Server/supabase/schema.sql in the Supabase SQL editor.');
  process.exit(1);
});
