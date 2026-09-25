const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER_SLIDESHOW = 'prime-hospitality/slideshow';
const FOLDER_COMPOUNDS = 'prime-hospitality/compounds';
const FOLDER_SITE = 'prime-hospitality/site';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase();
    const name = String(file.originalname || '').toLowerCase();
    const ok = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(name);
    if (!ok) return cb(new Error('Only image uploads are allowed'));
    return cb(null, true);
  },
});

function safeBaseName(filename = 'upload') {
  return (
    String(filename)
      .replace(/\.[^.]+$/, '')
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'upload'
  );
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function uploadBufferToCloudinary(buffer, filename = 'upload', mimetype = '', opts = {}) {
  if (!isCloudinaryConfigured()) {
    return Promise.reject(new Error('Cloudinary is not configured. Set CLOUDINARY_* env vars.'));
  }
  const folder = opts.folder || FOLDER_SITE;
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      public_id: `${Date.now()}-${safeBaseName(filename)}`,
      resource_type: 'image',
      type: 'upload',
    };
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

function setCloudinaryFolder(folder) {
  return (req, _res, next) => {
    req.cloudinaryFolder = folder;
    next();
  };
}

async function attachCloudinaryUrls(req, _res, next) {
  try {
    const files = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    const folder = req.cloudinaryFolder || FOLDER_SITE;
    for (const file of files) {
      if (!file.buffer) continue;
      const result = await uploadBufferToCloudinary(file.buffer, file.originalname, file.mimetype, {
        folder,
      });
      file.path = result.secure_url;
      file.secure_url = result.secure_url;
      file.cloudinary_public_id = result.public_id;
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  cloudinary,
  upload,
  uploadBufferToCloudinary,
  setCloudinaryFolder,
  attachCloudinaryUrls,
  isCloudinaryConfigured,
  FOLDER_SLIDESHOW,
  FOLDER_COMPOUNDS,
  FOLDER_SITE,
};
