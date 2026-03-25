'use strict';

const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');

/**
 * Ensure status transition is valid using an allowlist map.
 * @param {string} entityType
 * @param {string} fromStatus
 * @param {string} toStatus
 */
function validateTransition(entityType, fromStatus, toStatus) {
  const maps = {
    defect: {
      OPEN: ['IN_REVIEW', 'CLOSED'],
      IN_REVIEW: ['ACTION_REQUIRED', 'CLOSED'],
      ACTION_REQUIRED: ['IN_ACTION', 'CLOSED'],
      IN_ACTION: ['VERIFICATION', 'CLOSED'],
      VERIFICATION: ['CLOSED', 'ACTION_REQUIRED'],
      CLOSED: [],
    },
    corrective_action: {
      OPEN: ['IN_PROGRESS', 'DONE', 'CANCELLED'],
      IN_PROGRESS: ['DONE', 'CANCELLED'],
      DONE: [],
      CANCELLED: [],
    },
  };

  const map = maps[entityType];
  if (!map) return; // if unknown, don't block
  const allowed = map[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    const err = new Error(`Invalid ${entityType} status transition: ${fromStatus} -> ${toStatus}`);
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
}

// PUBLIC_INTERFACE
async function recordStatusChange({
  entityType,
  entityId,
  fromStatus,
  toStatus,
  changedByUserId,
  changedByRole,
  note,
}) {
  /**
   * Record a status transition to the status_history collection.
   */
  const db = getDb();
  validateTransition(entityType, fromStatus, toStatus);

  await db.collection('status_history').insertOne({
    entityType,
    entityId: new ObjectId(entityId),
    fromStatus: fromStatus || null,
    toStatus,
    changedByUserId: changedByUserId ? new ObjectId(changedByUserId) : null,
    changedByRole: changedByRole || null,
    note: note || '',
    changedAt: new Date(),
  });
}

module.exports = {
  recordStatusChange,
};
