'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const uploadsController = require('../controllers/uploads');
const uploadsService = require('../services/uploads');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsService.getUploadDir()),
  filename: (req, file, cb) => {
    // Keep it simple: timestamp-rand + original ext
    const ext = path.extname(file.originalname || '');
    const safeExt = ext && ext.length <= 12 ? ext : '';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024), // 10MB
  },
});

/**
 * @swagger
 * tags:
 *   - name: Uploads
 *     description: File/image uploads attached to defects
 */

/**
 * @swagger
 * /api/defects/{defectId}/uploads:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload attachments for a defect (Quality Engineer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: defectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Uploaded attachments
 */
router.post(
  '/defects/:defectId/uploads',
  requireAuth,
  requireRole([ROLES.QUALITY_ENGINEER]),
  upload.array('files', 10),
  uploadsController.uploadDefectAttachments.bind(uploadsController)
);

module.exports = router;
