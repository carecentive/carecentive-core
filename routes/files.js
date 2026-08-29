const express = require('express');
const router = express.Router();
const path = require('path');
const multiparty = require('multiparty');
const fs = require('fs');
var util = require('util');
var logger = require('winston');
const moment = require('moment');

const authentication = require('../source/Authentication')

const FileService = require('../services/FileService');

// Upload limits. Overridable via env; conservative defaults for a health app.
const MAX_UPLOAD_BYTES = Number(process.env.UPLOAD_MAX_BYTES) || 10 * 1024 * 1024; // 10 MiB
const ALLOWED_EXTENSIONS = (process.env.UPLOAD_ALLOWED_EXTENSIONS ||
  '.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

function safeUnlink(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
}

/* Add a new file to the database */
router.post('/', authentication.authenticateToken, function (req, res, next) {
  const userId = req.authData.user_id;

  if (!process.env.PROJECT_PATH) {
    return res.status(500).send("PROJECT_PATH_NOT_DEFINED");
  }

  const form = new multiparty.Form({
    maxFilesSize: MAX_UPLOAD_BYTES,
    maxFields: 20,
    maxFieldsSize: 1 * 1024 * 1024,
  });

  form.parse(req, async function (err, fields, files) {
    const uploaded = files && files.data ? files.data[0] : null;

    try {
      if (err) {
        // multiparty raises this when maxFilesSize / maxFields is exceeded, etc.
        safeUnlink(uploaded && uploaded.path);
        const tooLarge = /maxFilesSize|maximum allowed size/i.test(err.message || '');
        return res.status(tooLarge ? 413 : 400).send(
          tooLarge ? "File exceeds the maximum allowed size." : "Malformed upload."
        );
      }

      if (!fields.type || fields.type.length === 0) {
        safeUnlink(uploaded && uploaded.path);
        return res.status(400).send("File type must be set.");
      }

      if (!uploaded) {
        return res.status(400).send("File data/content not present.");
      }

      const extension = path.extname(uploaded.originalFilename || '').toLowerCase();
      const mimeType = (uploaded.headers && uploaded.headers['content-type']) || '';

      if (!ALLOWED_EXTENSIONS.includes(extension) || !ALLOWED_MIME_TYPES.has(mimeType)) {
        safeUnlink(uploaded.path);
        return res.status(415).send("Unsupported file type.");
      }

      const savePath = path.join(process.env.PROJECT_PATH, "/uploads/");

      const fileId = await FileService.uploadFile(userId, fields.type[0], uploaded, savePath);

      return res.status(200).json({ fileId: fileId });
    }
    catch (controllerErr) {
      safeUnlink(uploaded && uploaded.path);
      return next(controllerErr);
    }
  });
});

module.exports = router;
