const { Router } = require('express');
const {
  getDashboard,
  listSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  listCompounds,
  createCompound,
  updateCompound,
  deleteCompound,
  reorderCompounds,
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  reorderHomeUnits,
  reorderSearchUnits,
  getSettings,
  saveSettings,
  usingSupabase,
} = require('../lib/cmsStore');
const { getAdminCredentials, signAdminToken, requireAdmin } = require('../middleware/adminAuth');
const {
  upload,
  attachCloudinaryUrls,
  setCloudinaryFolder,
  isCloudinaryConfigured,
  FOLDER_SLIDESHOW,
  FOLDER_COMPOUNDS,
  FOLDER_SITE,
} = require('../config/cloudinary');
const { isSupabaseConfigured } = require('../config/supabase');

const router = Router();

const FOLDER_MAP = {
  slideshow: FOLDER_SLIDESHOW,
  compounds: FOLDER_COMPOUNDS,
  site: FOLDER_SITE,
};

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const creds = getAdminCredentials();
  if (
    String(email || '')
      .toLowerCase()
      .trim() !== creds.email ||
    String(password || '') !== creds.password
  ) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  const token = signAdminToken({ email: creds.email });
  res.json({
    token,
    user: { email: creds.email, role: 'admin', name: 'Prime Admin' },
  });
});

router.get('/auth/me', requireAdmin, (req, res) => {
  res.json({
    user: { email: req.admin.email, role: 'admin', name: 'Prime Admin' },
  });
});

router.post(
  '/drive/folder-images',
  requireAdmin,
  wrap(async (req, res) => {
    const { listFolderImages } = require('../lib/googleDrive');
    const url = req.body?.url || req.body?.folderUrl || '';
    const result = await listFolderImages(url);
    res.json(result);
  })
);

router.post(
  '/upload',
  requireAdmin,
  (req, res, next) => {
    const folderKey = String(req.query.folder || req.body?.folder || 'site').toLowerCase();
    if (folderKey === 'units') {
      return res.status(400).json({
        error: 'Unit photos must use a Google Drive folder link — Cloudinary is not used for units.',
      });
    }
    const folder = FOLDER_MAP[folderKey] || FOLDER_SITE;
    setCloudinaryFolder(folder)(req, res, next);
  },
  upload.single('file'),
  attachCloudinaryUrls,
  (req, res) => {
    if (!req.file?.secure_url) {
      return res.status(400).json({
        error: isCloudinaryConfigured()
          ? 'Upload failed'
          : 'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      });
    }
    res.status(201).json({
      url: req.file.secure_url,
      public_id: req.file.cloudinary_public_id,
    });
  }
);

router.get(
  '/dashboard',
  requireAdmin,
  wrap(async (_req, res) => {
    const dash = await getDashboard();
    res.json({
      ...dash,
      cloudinaryConfigured: isCloudinaryConfigured(),
      supabaseConfigured: isSupabaseConfigured(),
      storage: {
        database: usingSupabase() ? 'supabase' : 'json',
        unitPhotos: 'google-drive',
        otherPhotos: 'cloudinary',
      },
    });
  })
);

/* ——— Slideshow (Cloudinary images) ——— */
router.get(
  '/slideshow',
  requireAdmin,
  wrap(async (_req, res) => {
    res.json({ items: await listSlides() });
  })
);

router.post(
  '/slideshow',
  requireAdmin,
  wrap(async (req, res) => {
    const { image, alt = '', enabled = true } = req.body || {};
    if (!image) return res.status(400).json({ error: 'image is required' });
    await createSlide({ image, alt, enabled });
    res.status(201).json({ items: await listSlides() });
  })
);

router.patch(
  '/slideshow/reorder',
  requireAdmin,
  wrap(async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    res.json({ items: await reorderSlides(ids) });
  })
);

router.patch(
  '/slideshow/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const { image, alt, enabled } = req.body || {};
    const item = await updateSlide(req.params.id, {
      ...(image !== undefined ? { image } : {}),
      ...(alt !== undefined ? { alt } : {}),
      ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
    });
    if (!item) return res.status(404).json({ error: 'Slide not found' });
    res.json({ item });
  })
);

router.delete(
  '/slideshow/:id',
  requireAdmin,
  wrap(async (req, res) => {
    res.json({ items: await deleteSlide(req.params.id) });
  })
);

/* ——— Compounds (Cloudinary cover images) ——— */
router.get(
  '/compounds',
  requireAdmin,
  wrap(async (_req, res) => {
    res.json({ items: await listCompounds() });
  })
);

router.post(
  '/compounds',
  requireAdmin,
  wrap(async (req, res) => {
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ error: 'name is required' });
    const item = await createCompound(body);
    res.status(201).json({ item });
  })
);

router.patch(
  '/compounds/reorder',
  requireAdmin,
  wrap(async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    res.json({ items: await reorderCompounds(ids) });
  })
);

router.patch(
  '/compounds/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const item = await updateCompound(req.params.id, req.body || {});
    if (!item) return res.status(404).json({ error: 'Compound not found' });
    res.json({ item });
  })
);

router.delete(
  '/compounds/:id',
  requireAdmin,
  wrap(async (req, res) => {
    res.json({ items: await deleteCompound(req.params.id) });
  })
);

/* ——— Units (Google Drive galleries) ——— */
router.get(
  '/units',
  requireAdmin,
  wrap(async (_req, res) => {
    const units = await listUnits();
    const { sortBy } = require('../lib/cmsStore');
    res.json({
      items: sortBy(units, 'searchOrder'),
      home: sortBy(
        units.filter((u) => u.featured),
        'homeOrder'
      ),
    });
  })
);

router.patch(
  '/units/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const sync = require('../services/kwentraSync');
    const result = await sync.saveUnitWithSync(req.params.id, req.body || {});
    if (!result.unit) return res.status(404).json({ error: 'Unit not found' });
    res.json({ item: result.unit, kwentra: result.kwentra });
  })
);

router.post(
  '/units',
  requireAdmin,
  wrap(async (req, res) => {
    const body = req.body || {};
    if (!body.title) return res.status(400).json({ error: 'title is required' });
    const item = await createUnit(body);
    const sync = require('../services/kwentraSync');
    const kw = await sync.pushUnitEdit(item);
    res.status(201).json({ item, kwentra: kw });
  })
);

router.patch(
  '/units/reorder-home',
  requireAdmin,
  wrap(async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    res.json({ items: await reorderHomeUnits(ids) });
  })
);

router.patch(
  '/units/reorder-search',
  requireAdmin,
  wrap(async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    res.json({ items: await reorderSearchUnits(ids) });
  })
);

router.delete(
  '/units/:id',
  requireAdmin,
  wrap(async (req, res) => {
    res.json({ items: await deleteUnit(req.params.id) });
  })
);

router.get(
  '/settings',
  requireAdmin,
  wrap(async (_req, res) => {
    res.json({ settings: await getSettings() });
  })
);

router.put(
  '/settings',
  requireAdmin,
  wrap(async (req, res) => {
    res.json({ settings: await saveSettings(req.body || {}) });
  })
);

module.exports = router;
