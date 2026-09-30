/**
 * Import a property fact-sheet workbook into the CMS.
 * Usage:
 *   npm run import:sheet -- "C:\path\Prime Residence New Cairo.xlsx"            (preview only)
 *   npm run import:sheet -- "C:\path\file.xlsx" --apply                          (write changes)
 *   npm run import:sheet -- "C:\path\file.xlsx" --apply --destination=east-cairo (new property)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const { ensureReady } = require('../lib/cmsStore');
const { parseInventoryWorkbook } = require('../lib/inventorySheet');
const { importInventory } = require('../services/inventoryImport');

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file || !fs.existsSync(file)) {
    console.error('Pass the path to an .xlsx file.');
    process.exit(1);
  }
  const apply = args.includes('--apply');
  const destinationId = (args.find((a) => a.startsWith('--destination=')) || '').split('=')[1] || '';

  await ensureReady();
  const parsed = await parseInventoryWorkbook(fs.readFileSync(file));
  const report = await importInventory(parsed, { dryRun: !apply, destinationId });

  for (const p of report.properties) {
    console.log(`\n${p.name} [${p.action}] ${p.destination ? `· ${p.destination}` : ''}`);
    if (p.changes.length) console.log(`  property fields: ${p.changes.join(', ')}`);
    for (const u of p.units) {
      console.log(`  ${u.action.padEnd(9)} ${u.title}${u.fields?.length ? ` (${u.fields.join(', ')})` : ''}`);
    }
  }
  console.log('\nSummary:', report.summary);
  report.warnings.forEach((w) => console.warn('! ' + w));
  if (!apply) console.log('\nPreview only — run again with --apply to save.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
