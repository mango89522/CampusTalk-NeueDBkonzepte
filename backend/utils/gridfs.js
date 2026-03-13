const mongoose = require('mongoose');

const MEDIA_BUCKET_NAME = 'media';
const MB_IN_BYTES = 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

const ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime'
]);

let bucketCache = null;
let cachedDb = null;

function parseMaxSizeMb(value, fallbackMb) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallbackMb * MB_IN_BYTES;
  }

  return parsed * MB_IN_BYTES;
}

function getUploadLimitsBytes() {
  return {
    imageMaxBytes: parseMaxSizeMb(process.env.MEDIA_IMAGE_MAX_MB, 10),
    videoMaxBytes: parseMaxSizeMb(process.env.MEDIA_VIDEO_MAX_MB, 80)
  };
}

function detectMediaType(mimeType) {
  if (!mimeType) return null;

  if (ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) return 'image';
  if (ALLOWED_VIDEO_MIME_TYPES.has(mimeType)) return 'video';

  return null;
}

function detectMediaTypeFromFileDocument(fileDocument) {
  if (!fileDocument) return null;

  const fromMimeType = detectMediaType(fileDocument.contentType || fileDocument.metadata?.mimeType);
  if (fromMimeType) return fromMimeType;

  if (fileDocument.metadata?.mediaType === 'image' || fileDocument.metadata?.mediaType === 'video') {
    return fileDocument.metadata.mediaType;
  }

  return null;
}

function ensureMongoConnection() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB-Verbindung ist nicht bereit');
  }
}

function getMediaBucket() {
  ensureMongoConnection();

  if (!bucketCache || cachedDb !== mongoose.connection.db) {
    cachedDb = mongoose.connection.db;
    bucketCache = new mongoose.mongo.GridFSBucket(cachedDb, {
      bucketName: MEDIA_BUCKET_NAME
    });
  }

  return bucketCache;
}

function getFilesCollection() {
  ensureMongoConnection();
  return mongoose.connection.db.collection(`${MEDIA_BUCKET_NAME}.files`);
}

function toObjectId(fileId) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(fileId);
}

function buildMediaUrl(req, fileId) {
  return `${req.protocol}://${req.get('host')}/api/media/${fileId}`;
}

async function getMediaFileDocument(fileId) {
  const objectId = toObjectId(fileId);

  if (!objectId) return null;

  return getFilesCollection().findOne({ _id: objectId });
}

function openMediaDownloadStream(fileId, options = {}) {
  const objectId = toObjectId(fileId);

  if (!objectId) {
    throw new Error('Ungültige Media-ID');
  }

  return getMediaBucket().openDownloadStream(objectId, options);
}

async function uploadBufferToGridFS({ buffer, mimetype, originalname, metadata = {} }) {
  const bucket = getMediaBucket();
  const filename = originalname || `upload-${Date.now()}`;

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimetype,
      metadata: {
        ...metadata,
        uploadedAt: new Date()
      }
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', async () => {
      try {
        const file = await getMediaFileDocument(uploadStream.id);
        resolve(file || { _id: uploadStream.id, filename, contentType: mimetype });
      } catch (err) {
        reject(err);
      }
    });
    uploadStream.end(buffer);
  });
}

async function deleteMediaFileById(fileId) {
  const objectId = toObjectId(fileId);

  if (!objectId) return false;

  try {
    await getMediaBucket().delete(objectId);
    return true;
  } catch (err) {
    if (err.code === 26) {
      return false;
    }

    throw err;
  }
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  getUploadLimitsBytes,
  detectMediaType,
  detectMediaTypeFromFileDocument,
  buildMediaUrl,
  getMediaFileDocument,
  openMediaDownloadStream,
  uploadBufferToGridFS,
  deleteMediaFileById
};
