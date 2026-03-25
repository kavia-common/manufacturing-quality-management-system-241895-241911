'use strict';

const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');

// PUBLIC_INTERFACE
async function writeAuditLog({
  actorUserId,
  actorRole,
  action,
  entityType,
  entityId,
  meta = {},
}) {
  /**
   * Persist an audit log event.
   * @param {object} params
   * @returns {Promise<void>}
   */
  const db = getDb();

  const doc = {
    actorUserId: actorUserId ? new ObjectId(actorUserId) : null,
    actorRole: actorRole || null,
    action,
    entityType,
    entityId: entityId ? new ObjectId(entityId) : null,
    meta,
    createdAt: new Date(),
  };

  await db.collection('audit_logs').insertOne(doc);
}

module.exports = {
  writeAuditLog,
};
