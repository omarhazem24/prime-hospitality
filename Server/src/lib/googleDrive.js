/**
 * Google Drive helpers for unit galleries (folder links → image URLs).
 * Prefer GOOGLE_DRIVE_API_KEY for reliable listing of public folders.
 */

const IMAGE_MIME = /^(image\/|application\/octet-stream)/i;

function extractFolderId(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw) && !raw.includes('/')) return raw;

  const folderMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  const openMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  return null;
}

function extractFileId(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const fileMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;
  return null;
}

/** Stable URL that works in <img> for publicly shared Drive files */
function toImageUrl(fileId) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function toThumbnailUrl(fileId, size = 1600) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

function getApiKey() {
  return String(process.env.GOOGLE_DRIVE_API_KEY || '').trim() || null;
}

async function listViaApi(folderId) {
  const key = getApiKey();
  if (!key) return null;

  const q = `'${folderId}' in parents and trashed = false`;
  const fields = 'files(id,name,mimeType)';
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', fields);
  url.searchParams.set('pageSize', '200');
  url.searchParams.set('orderBy', 'name');
  url.searchParams.set('key', key);
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');

  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || res.statusText || 'Drive API error';
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const files = Array.isArray(data.files) ? data.files : [];
  return files
    .filter((f) => f.mimeType && (IMAGE_MIME.test(f.mimeType) || f.mimeType.startsWith('image/')))
    .map((f) => ({
      id: f.id,
      name: f.name || f.id,
      url: toImageUrl(f.id),
      thumbnail: toThumbnailUrl(f.id),
    }));
}

/** Best-effort parse of Drive's embedded folder view (public folders, no API key). */
async function listViaEmbeddedView(folderId) {
  const url = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
  });
  if (!res.ok) {
    const err = new Error(`Could not open Drive folder (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const html = await res.text();
  const ids = [];
  const seen = new Set();

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{20,})/g,
    /thumbnail\?id=([a-zA-Z0-9_-]{20,})/g,
    /\["([a-zA-Z0-9_-]{25,})",\d+,\["image\//g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const id = m[1];
      if (id === folderId || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }

  return ids.map((id, i) => ({
    id,
    name: `Photo ${i + 1}`,
    url: toImageUrl(id),
    thumbnail: toThumbnailUrl(id),
  }));
}

/**
 * List image files from a shared Google Drive folder URL or ID.
 * Folder must be shared as “Anyone with the link”.
 */
async function listFolderImages(folderUrlOrId) {
  const folderId = extractFolderId(folderUrlOrId);
  if (!folderId) {
    const err = new Error('Invalid Google Drive folder link');
    err.status = 400;
    throw err;
  }

  let images = null;
  let method = 'api';

  try {
    images = await listViaApi(folderId);
  } catch (err) {
    if (getApiKey()) {
      err.message = `Drive API: ${err.message}. Make sure the folder is shared as “Anyone with the link”.`;
      throw err;
    }
  }

  if (!images) {
    method = 'embedded';
    images = await listViaEmbeddedView(folderId);
  }

  if (!images.length) {
    const err = new Error(
      getApiKey()
        ? 'No images found in that folder. Share it as “Anyone with the link” and ensure it contains image files.'
        : 'No images found. Share the folder as “Anyone with the link”, or set GOOGLE_DRIVE_API_KEY in Server/.env for reliable listing.'
    );
    err.status = 404;
    throw err;
  }

  return {
    folderId,
    method,
    images,
    urls: images.map((i) => i.url),
  };
}

module.exports = {
  extractFolderId,
  extractFileId,
  toImageUrl,
  listFolderImages,
};
