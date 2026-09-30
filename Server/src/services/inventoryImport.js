/**
 * Apply a parsed inventory workbook to the CMS.
 *  - Property matched by name (created when a destination is given)
 *  - Room types matched by title inside that property → create / update
 *  - Old placeholder unit types of that property (not in the sheet, not linked to Kwentra) → hidden
 * Run with dryRun first to preview; nothing is written until dryRun is false.
 */
const {
  listCompounds,
  listUnits,
  listDestinations,
  createCompound,
  updateCompound,
  createUnit,
  updateUnit,
  slugify,
} = require('../lib/cmsStore');

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const PROPERTY_KEYS = [
  'description',
  'address',
  'mapsUrl',
  'latitude',
  'longitude',
  'buildingNumber',
  'phone',
  'facilities',
  'driveFolderUrl',
  'factSheetUrl',
];

const UNIT_KEYS = [
  'title',
  'unitType',
  'bedrooms',
  'bathrooms',
  'areaSqm',
  'maxGuests',
  'amenities',
  'roomCount',
  'unitNumbers',
  'floor',
  'bedType',
];

const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Only the keys whose sheet value is present and differs from what is stored. */
function diff(current, incoming, keys) {
  const patch = {};
  for (const key of keys) {
    if (isEmpty(incoming[key])) continue;
    if (!same(current?.[key], incoming[key])) patch[key] = incoming[key];
  }
  return patch;
}

async function driveImages(url) {
  if (!url) return [];
  try {
    const { listFolderImages } = require('../lib/googleDrive');
    return (await listFolderImages(url)).urls || [];
  } catch {
    return [];
  }
}

function uniqueSlug(base, taken) {
  let slug = slugify(base);
  let n = 2;
  while (taken.has(slug)) slug = `${slugify(base)}-${n++}`;
  taken.add(slug);
  return slug;
}

async function importInventory(parsed, { dryRun = true, destinationId = '', hideMissing = true } = {}) {
  const [compounds, units, destinations] = await Promise.all([listCompounds(), listUnits(), listDestinations()]);
  const slugs = new Set(units.map((u) => u.slug));
  const report = {
    dryRun,
    properties: [],
    summary: { propertiesCreated: 0, propertiesUpdated: 0, unitsCreated: 0, unitsUpdated: 0, unitsHidden: 0 },
    warnings: [...(parsed.warnings || [])],
  };

  for (const prop of parsed.properties || []) {
    let compound = compounds.find((c) => norm(c.name) === norm(prop.name)) || null;
    const entry = {
      name: prop.name,
      compoundId: compound?.id || '',
      destination: compound?.region || '',
      action: compound ? 'update' : 'create',
      changes: [],
      units: [],
    };
    report.properties.push(entry);

    if (!compound) {
      const dest = destinations.find((d) => d.id === destinationId);
      if (!dest) {
        entry.action = 'needs-destination';
        report.warnings.push(`“${prop.name}” is a new property — pick its destination before importing.`);
        entry.units = prop.roomTypes.map((r) => ({ title: r.title, action: 'create', unitType: r.unitType }));
        continue;
      }
      entry.destination = dest.name;
      const body = { name: prop.name, destinationId: dest.id, city: '' };
      PROPERTY_KEYS.forEach((k) => !isEmpty(prop[k]) && (body[k] = prop[k]));
      entry.changes = Object.keys(body).filter((k) => !['name', 'destinationId', 'city'].includes(k));
      if (!dryRun) compound = await createCompound(body);
      else compound = { id: slugify(prop.name), name: prop.name, ...body };
      entry.compoundId = compound.id;
      report.summary.propertiesCreated += 1;
    } else {
      const patch = diff(compound, prop, PROPERTY_KEYS);
      entry.changes = Object.keys(patch);
      if (entry.changes.length) {
        if (!dryRun) compound = await updateCompound(compound.id, patch);
        report.summary.propertiesUpdated += 1;
      }
    }

    const existing = units.filter((u) => u.compoundId === compound.id);
    const matched = new Set();
    let folderImages = null;

    for (const room of prop.roomTypes) {
      const unit = existing.find((u) => !matched.has(u.id) && norm(u.title) === norm(room.title));
      if (unit) {
        matched.add(unit.id);
        const patch = diff(unit, room, UNIT_KEYS);
        if (unit.published === false) patch.published = true;
        if (isEmpty(unit.description) && room.description) patch.description = room.description;
        if (isEmpty(unit.driveFolderUrl) && prop.driveFolderUrl) patch.driveFolderUrl = prop.driveFolderUrl;
        const fields = Object.keys(patch);
        entry.units.push({ title: room.title, action: fields.length ? 'update' : 'unchanged', id: unit.id, fields });
        if (fields.length) {
          if (!dryRun) await updateUnit(unit.id, patch);
          report.summary.unitsUpdated += 1;
        }
        continue;
      }

      const template =
        existing.find((u) => !matched.has(u.id) && !u.kwentraRoomTypeId && u.unitType === room.unitType) ||
        existing.find((u) => u.unitType === room.unitType) ||
        null;
      const prices = existing.map((u) => Number(u.pricePerNight)).filter((n) => n > 0);
      const pricePerNight = template?.pricePerNight || (prices.length ? Math.min(...prices) : 0);

      let images = template?.images || [];
      if (!dryRun && prop.driveFolderUrl) {
        if (folderImages === null) folderImages = await driveImages(prop.driveFolderUrl);
        if (folderImages.length) images = folderImages;
      }

      const body = {
        ...Object.fromEntries(UNIT_KEYS.filter((k) => !isEmpty(room[k])).map((k) => [k, room[k]])),
        slug: uniqueSlug(`${prop.name} ${room.title}`, slugs),
        compoundId: compound.id,
        propertyType: room.unitType === 'Studio' ? 'Studio' : 'Apartment',
        description: room.description,
        pricePerNight,
        currency: template?.currency || 'EGP',
        images,
        driveFolderUrl: prop.driveFolderUrl || '',
        published: true,
      };
      entry.units.push({ title: room.title, action: 'create', unitType: room.unitType, pricePerNight });
      if (!pricePerNight) report.warnings.push(`“${room.title}” has no nightly price yet — set it in the admin or Kwentra.`);
      if (!dryRun) await createUnit(body);
      report.summary.unitsCreated += 1;
    }

    if (hideMissing) {
      for (const u of existing) {
        if (matched.has(u.id) || u.kwentraRoomTypeId || u.published === false) continue;
        entry.units.push({ title: u.title, action: 'hide', id: u.id });
        if (!dryRun) await updateUnit(u.id, { published: false, featured: false });
        report.summary.unitsHidden += 1;
      }
    }
  }

  return report;
}

module.exports = { importInventory };
