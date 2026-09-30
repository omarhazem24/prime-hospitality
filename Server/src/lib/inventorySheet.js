/**
 * Reads the property fact-sheet workbook ("Prime Residence New Cairo.xlsx" template):
 *   one property row (name | phone, description, facilities, address, maps, photos, fact sheet)
 *   followed by "Room Type" rows (name, size, number of units, unit numbers, baths, beds, max adults,
 *   in-unit description, extras, floor). Several properties / sheets per workbook are supported.
 */
const ExcelJS = require('exceljs');
const { coordsFromMapsUrl } = require('./fields');

const HEADERS = [
  ['name', /property\s*name/],
  ['description', /^description/],
  ['size', /^size|area/],
  ['count', /number\s*of\s*units|units\s*count/],
  ['unitNumbers', /unit\s*numbers?/],
  ['bathrooms', /bathroom/],
  ['bedrooms', /bedroom/],
  ['maxGuests', /max\s*(adult|guest|occupancy)/],
  ['details', /^description/],
  ['facilities', /facilit|amenit/],
  ['floor', /^floor/],
  ['buildingNumber', /property\s*number|building/],
  ['address', /address/],
  ['mapsUrl', /map/],
  ['photos', /photo|drive/],
  ['factSheet', /fact\s*sheet/],
];

/** Column order of the original template — used when a header row can't be recognised. */
const FALLBACK = HEADERS.map(([key]) => key);

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const SMALL_WORDS = new Set(['with', 'and', 'of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for']);

function cellText(cell) {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
  if (v.text != null) return (typeof v.text === 'string' ? v.text : cellText({ value: v.text })).trim();
  if (v.result != null) return String(v.result).trim();
  return '';
}

function cellLink(cell) {
  const link = cell?.hyperlink || cell?.value?.hyperlink;
  if (link && /^https?:\/\//i.test(link)) return link.trim();
  const text = cellText(cell);
  return /^https?:\/\//i.test(text) ? text : '';
}

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function parseNumber(value) {
  const s = squash(value).toLowerCase();
  if (!s) return null;
  const digits = s.match(/\d+(?:\.\d+)?/);
  if (digits) return Number(digits[0]);
  const word = s.split(/[^a-z]+/).find((w) => NUMBER_WORDS[w]);
  return word ? NUMBER_WORDS[word] : null;
}

function tidyItem(text) {
  let s = squash(text)
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\.$/, '')
    .replace(/\s*\/\s*7\b/g, '/7')
    .replace(/\bwi\s*-?\s*fi\b/gi, 'Wi-Fi')
    .replace(/\bcoffe\b/gi, 'Coffee')
    .replace(/\s*,\s*$/, '');
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uniqueList(items) {
  const seen = new Set();
  const out = [];
  for (const item of items.map(tidyItem).filter(Boolean)) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

const splitComma = (s) => String(s || '').split(/[,;\n]/);
const splitSlash = (s) => String(s || '').split(/\s\/\s|[,;\n]/);
const splitDash = (s) => String(s || '').split(/\s+-\s*|\s*-\s+|[,;\n]/);

function titleCase(text) {
  return squash(text)
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .split(' ')
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return word.replace(/^(\(?)(\w)/, (_, p, c) => p + c.toUpperCase());
    })
    .join(' ');
}

function bedTypeFrom(text) {
  const types = [];
  const re = /\b(king|queen|twin|double|single)\b(?:\s*-?\s*size)?\s*beds?\b/gi;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const t = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    if (!types.includes(t)) types.push(t);
  }
  if (!types.length) return '';
  return `${types.join(' + ')} ${types.length > 1 ? 'beds' : 'bed'}`;
}

function unitTypeFor(title, bedrooms) {
  if (/studio/i.test(title)) return 'Studio';
  const n = Number(bedrooms) || parseNumber(title.match(/(one|two|three|four|\d)\s*-?\s*bed/i)?.[1]) || 1;
  return `${Math.min(Math.max(n, 1), 4)} BDR`;
}

function composeDescription(room, propertyName) {
  const parts = [];
  const where = [propertyName, room.floor && room.floor.toLowerCase()].filter(Boolean).join(', ');
  parts.push(`${room.areaSqm ? `A ${room.areaSqm} m² ` : 'A '}${room.title.toLowerCase()}${where ? ` at ${where}` : ''}.`);
  if (room.maxGuests) {
    parts.push(`Sleeps up to ${room.maxGuests} guests${room.bedType ? ` (${room.bedType.toLowerCase()})` : ''}.`);
  }
  const highlights = room.amenities.filter((a) => !/bed\b/i.test(a)).slice(0, 5);
  if (highlights.length) parts.push(`Includes ${highlights.join(', ').toLowerCase()} and more.`);
  return parts.join(' ');
}

function mapHeaders(row) {
  const columns = {};
  const taken = new Set();
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const label = squash(cellText(cell)).toLowerCase();
    if (!label) return;
    const hit = HEADERS.find(([key, re]) => !taken.has(key) && re.test(label));
    if (hit) {
      taken.add(hit[0]);
      columns[hit[0]] = col;
    }
  });
  return taken.has('name') && taken.size >= 6 ? columns : null;
}

function readSheet(ws, warnings) {
  const properties = [];
  let columns = null;
  let current = null;

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (!columns) {
      columns = mapHeaders(row);
      if (columns) return;
      columns = Object.fromEntries(FALLBACK.map((key, i) => [key, i + 1]));
    }
    const get = (key) => (columns[key] ? row.getCell(columns[key]) : null);
    const text = (key) => squash(cellText(get(key)));
    const first = text('name');
    if (!first && !text('description')) return;

    if (/^room\s*type/i.test(first)) {
      if (!current) {
        warnings.push(`${ws.name} row ${rowNumber}: room type before any property row — skipped`);
        return;
      }
      const title = titleCase(text('description'));
      if (!title) return;
      const details = text('details');
      const unitNumbers = text('unitNumbers')
        .split(/[\s,;/-]+/)
        .map((s) => s.trim())
        .filter((s) => /\d/.test(s));
      const room = {
        title,
        areaSqm: parseNumber(text('size')),
        roomCount: parseNumber(text('count')) ?? (unitNumbers.length || null),
        unitNumbers,
        bathrooms: parseNumber(text('bathrooms')),
        bedrooms: parseNumber(text('bedrooms')),
        maxGuests: parseNumber(text('maxGuests')),
        floor: titleCase(text('floor')),
        bedType: bedTypeFrom(details) || bedTypeFrom(title),
        amenities: uniqueList([...splitComma(details), ...splitSlash(text('facilities'))]),
        row: rowNumber,
      };
      room.unitType = unitTypeFor(title, room.bedrooms);
      room.description = composeDescription(room, current.name);
      if (room.roomCount && unitNumbers.length && room.roomCount !== unitNumbers.length) {
        warnings.push(
          `${ws.name} row ${rowNumber}: “${title}” says ${room.roomCount} units but lists ${unitNumbers.length} unit numbers`
        );
      }
      current.roomTypes.push(room);
      return;
    }

    const [name, ...rest] = cellText(get('name'))
      .split(/\||\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const phone = rest.join(' ').replace(/[^\d+]/g, '');
    const mapsUrl = cellLink(get('mapsUrl'));
    const coords = coordsFromMapsUrl(mapsUrl);
    const factSheetUrl = cellLink(get('factSheet'));
    const isDriveFolder = /drive\.google\.com\/drive\/(u\/\d+\/)?folders\//i.test(factSheetUrl);
    current = {
      name: titleCase(name),
      phone,
      description: text('description') || text('details'),
      totalUnits: parseNumber(text('count')),
      facilities: uniqueList(splitDash(text('facilities'))),
      buildingNumber: text('buildingNumber'),
      address: text('address'),
      mapsUrl,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      driveFolderUrl: cellLink(get('photos')) || (isDriveFolder ? factSheetUrl : ''),
      factSheetUrl,
      roomTypes: [],
      sheet: ws.name,
      row: rowNumber,
    };
    properties.push(current);
  });

  for (const p of properties) {
    const listed = p.roomTypes.reduce((s, r) => s + (r.roomCount || 0), 0);
    if (p.totalUnits && listed && p.totalUnits !== listed) {
      warnings.push(`${p.name}: property total is ${p.totalUnits} units but room types add up to ${listed}`);
    }
    if (!p.roomTypes.length) warnings.push(`${p.name}: no “Room Type” rows found`);
  }
  return properties;
}

/** Parse an .xlsx buffer → { properties, warnings } */
async function parseInventoryWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const warnings = [];
  const properties = [];
  wb.eachSheet((ws) => {
    properties.push(...readSheet(ws, warnings));
  });
  return { properties, warnings };
}

module.exports = { parseInventoryWorkbook, bedTypeFrom, titleCase };
