const multer = require('multer');
const {
  detectMediaType,
  detectMediaTypeFromFileDocument,
  getUploadLimitsBytes,
  uploadBufferToGridFS,
  buildMediaUrl,
  getMediaFileDocument
} = require('./gridfs');

function mb(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function getExpectedMediaTypeForField(fieldName) {
  if (fieldName === 'image') return 'image';
  if (fieldName === 'video') return 'video';
  return null;
}

function createMediaUploadMiddleware(fieldDefinitions) {
  const { imageMaxBytes, videoMaxBytes } = getUploadLimitsBytes();

  return (req, res, next) => {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: Math.max(imageMaxBytes, videoMaxBytes)
      },
      fileFilter: (uploadReq, file, cb) => {
        const mediaType = detectMediaType(file.mimetype);

        if (!mediaType) {
          const err = new Error('Nur Bilder und Videos mit unterstützten Formaten sind erlaubt');
          err.statusCode = 400;
          return cb(err);
        }

        const expectedType = getExpectedMediaTypeForField(file.fieldname);
        if (expectedType && mediaType !== expectedType) {
          const err = new Error(
            expectedType === 'image'
              ? 'Im Feld image sind nur Bilder erlaubt'
              : 'Im Feld video sind nur Videos erlaubt'
          );
          err.statusCode = 400;
          return cb(err);
        }

        cb(null, true);
      }
    }).fields(fieldDefinitions);

    upload(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: `Datei ist zu groß. Max. Bildgröße: ${mb(imageMaxBytes)} MB, Max. Videogröße: ${mb(videoMaxBytes)} MB`
        });
      }

      if (err instanceof multer.MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: `Unerwartetes Datei-Feld: ${err.field}` });
      }

      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }

      return res.status(400).json({ message: err.message || 'Upload fehlgeschlagen' });
    });
  };
}

function getUploadedFile(req, fieldName) {
  if (!req.files || !req.files[fieldName] || req.files[fieldName].length === 0) {
    return null;
  }

  return req.files[fieldName][0];
}

async function uploadRequestFile({ req, file, userId, expectedType }) {
  if (!file) {
    return null;
  }

  const mediaType = detectMediaType(file.mimetype);
  if (!mediaType || mediaType !== expectedType) {
    throw new Error(expectedType === 'image' ? 'Ungültiger Bildtyp' : 'Ungültiger Videotyp');
  }

  const { imageMaxBytes, videoMaxBytes } = getUploadLimitsBytes();
  const maxBytes = mediaType === 'image' ? imageMaxBytes : videoMaxBytes;

  if (file.size > maxBytes) {
    throw new Error(
      `Datei ist zu groß. Maximal erlaubt für ${mediaType === 'image' ? 'Bilder' : 'Videos'}: ${mb(maxBytes)} MB`
    );
  }

  const storedFile = await uploadBufferToGridFS({
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalname: file.originalname,
    metadata: {
      uploadedBy: userId,
      mediaType,
      mimeType: file.mimetype
    }
  });

  return {
    mediaId: String(storedFile._id),
    mediaUrl: buildMediaUrl(req, storedFile._id),
    mediaType
  };
}

async function resolveMediaChange({
  req,
  res,
  mediaIdInput,
  mediaUrlInput,
  uploadedFile,
  expectedType,
  label
}) {
  const hasMediaId = mediaIdInput !== undefined;
  const hasMediaUrl = mediaUrlInput !== undefined;
  const hasUploadedFile = Boolean(uploadedFile);
  const activeInputCount = [
    hasUploadedFile,
    hasMediaId && mediaIdInput !== null && mediaIdInput !== '',
    hasMediaUrl
  ].filter(Boolean).length;

  if (activeInputCount > 1) {
    res.status(400).json({
      message: `${label}: Bitte nur eine Quelle angeben (Upload, Media-ID oder URL)`
    });
    return { ok: false };
  }

  if (!hasUploadedFile && !hasMediaId && !hasMediaUrl) {
    return { ok: true, changed: false };
  }

  if (hasUploadedFile) {
    try {
      const uploadedMedia = await uploadRequestFile({
        req,
        file: uploadedFile,
        userId: req.user.id,
        expectedType
      });

      return {
        ok: true,
        changed: true,
        nextMediaId: uploadedMedia.mediaId,
        nextMediaUrl: uploadedMedia.mediaUrl,
        uploadedNewMediaId: uploadedMedia.mediaId
      };
    } catch (err) {
      res.status(400).json({ message: err.message });
      return { ok: false };
    }
  }

  if (hasMediaId) {
    if (mediaIdInput === null || mediaIdInput === '') {
      return {
        ok: true,
        changed: true,
        nextMediaId: null,
        nextMediaUrl: hasMediaUrl ? mediaUrlInput : null
      };
    }

    const mediaFile = await getMediaFileDocument(mediaIdInput);
    if (!mediaFile) {
      res.status(404).json({ message: `${label} nicht gefunden` });
      return { ok: false };
    }

    if (detectMediaTypeFromFileDocument(mediaFile) !== expectedType) {
      res.status(400).json({ message: `${label} hat einen ungültigen Dateityp` });
      return { ok: false };
    }

    return {
      ok: true,
      changed: true,
      nextMediaId: String(mediaIdInput),
      nextMediaUrl: buildMediaUrl(req, mediaIdInput)
    };
  }

  return {
    ok: true,
    changed: true,
    nextMediaId: null,
    nextMediaUrl: mediaUrlInput
  };
}

module.exports = {
  mb,
  createMediaUploadMiddleware,
  getUploadedFile,
  uploadRequestFile,
  resolveMediaChange
};
