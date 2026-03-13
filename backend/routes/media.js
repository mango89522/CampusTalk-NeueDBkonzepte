const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { canManageResource, isAdmin } = require('../utils/helpers');
const {
  getMediaFileDocument,
  openMediaDownloadStream,
  deleteMediaFileById
} = require('../utils/gridfs');
const {
  createMediaUploadMiddleware,
  uploadRequestFile
} = require('../utils/mediaUpload');

const router = express.Router();
const uploadMediaFile = createMediaUploadMiddleware([{ name: 'file', maxCount: 1 }]);

router.post('/upload', auth, uploadMediaFile, async (req, res) => {
  try {
    const file = req.files?.file?.[0];

    if (!file) {
      return res.status(400).json({ message: 'Keine Datei übermittelt (Feldname: file)' });
    }

    const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
    const uploadedMedia = await uploadRequestFile({
      req,
      file,
      userId: req.user.id,
      expectedType: mediaType
    });

    res.status(201).json({
      mediaId: uploadedMedia.mediaId,
      mediaType: uploadedMedia.mediaType,
      url: uploadedMedia.mediaUrl,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Upload fehlgeschlagen' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Ungültige Media-ID' });
    }

    const file = await getMediaFileDocument(id);

    if (!file) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    const totalLength = Number(file.length || 0);
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', file.contentType || file.metadata?.mimeType || 'application/octet-stream');

    if (range) {
      const matches = /^bytes=(\d*)-(\d*)$/.exec(range);

      if (!matches) {
        return res.status(416).setHeader('Content-Range', `bytes */${totalLength}`).end();
      }

      const start = matches[1] ? Number.parseInt(matches[1], 10) : 0;
      const end = matches[2] ? Number.parseInt(matches[2], 10) : totalLength - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end < start ||
        end >= totalLength
      ) {
        return res.status(416).setHeader('Content-Range', `bytes */${totalLength}`).end();
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
      res.setHeader('Content-Length', end - start + 1);

      const partialStream = openMediaDownloadStream(id, {
        start,
        end: end + 1
      });

      partialStream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({ message: 'Fehler beim Lesen der Datei' });
        } else {
          res.destroy();
        }
      });

      return partialStream.pipe(res);
    }

    res.setHeader('Content-Length', totalLength);

    const fullStream = openMediaDownloadStream(id);
    fullStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ message: 'Fehler beim Lesen der Datei' });
      } else {
        res.destroy();
      }
    });

    fullStream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Dateiabruf fehlgeschlagen' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Ungültige Media-ID' });
    }

    const file = await getMediaFileDocument(id);

    if (!file) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    const uploadedBy = file.metadata?.uploadedBy;

    if (uploadedBy && !canManageResource(req.user, uploadedBy) && !isAdmin(req.user)) {
      return res.status(403).json({ message: 'Du darfst diese Datei nicht löschen' });
    }

    if (!uploadedBy && !isAdmin(req.user)) {
      return res.status(403).json({ message: 'Nur Admins dürfen diese Datei löschen' });
    }

    await deleteMediaFileById(id);
    res.json({ message: 'Datei wurde gelöscht' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Löschen fehlgeschlagen' });
  }
});

module.exports = router;
