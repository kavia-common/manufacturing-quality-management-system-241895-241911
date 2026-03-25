'use strict';

const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');
const { writeAuditLog } = require('./audit');

function ensureUploadDir() {
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// PUBLIC_INTERFACE
function getPublicUploadBaseUrl(req) {
  /**
   * Compute base URL for uploaded file URLs.
   * Uses UPLOAD_PUBLIC_BASE_URL if provided, otherwise derived from request.
   */
  const explicit = process.env.UPLOAD_PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const proto = req.secure ? 'https' : req.protocol;
  return `${proto}://${req.get('host')}`;
}

// PUBLIC_INTERFACE
function getUploadDir() {
  /**
   * Return ensured upload directory.
   */
  return ensureUploadDir();
}

// PUBLIC_INTERFACE
async function attachFilesToDefect({ defectId, files, actor, req }) {
  /**
   * Persist attachment metadata to defect record.
   */
  const db = getDb();
  const _id = new ObjectId(defectId);

  const defect = await db.collection('defects').findOne({ _id });
  if (!defect) {
    const err = new Error('Defect not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const baseUrl = getPublicUploadBaseUrl(req);
  const attachments = (files || []).map((f) => ({
    id: f.filename,
    type: f.mimetype && f.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE',
    filename: f.originalname,
    mimeType: f.mimetype,
    size: f.size,
    url: `${baseUrl}/uploads/${encodeURIComponent(f.filename)}`,
    createdAt: new Date().toISOString(),
  }));

  await db.collection('defects').updateOne(
    { _id },
    { $push: { attachments: { $each: attachments } }, $set: { updatedAt: new Date() } }
  );

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'DEFECT_ATTACHMENTS_UPLOADED',
    entityType: 'defect',
    entityId: defectId,
    meta: { count: attachments.length },
  });

  return attachments;
}

module.exports = {
  getUploadDir,
  attachFilesToDefect,
  getPublicUploadBaseUrl,
};
