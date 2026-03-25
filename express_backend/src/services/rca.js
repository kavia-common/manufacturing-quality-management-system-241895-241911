'use strict';

const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');
const { writeAuditLog } = require('./audit');
const { recordStatusChange } = require('./statusHistory');

// PUBLIC_INTERFACE
async function upsertRca({ defectId, input, actor }) {
  /**
   * Create or update Root Cause Analysis for a defect (1 per defect).
   */
  const db = getDb();
  const defectObjectId = new ObjectId(defectId);

  const existingDefect = await db.collection('defects').findOne({ _id: defectObjectId });
  if (!existingDefect) {
    const err = new Error('Defect not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date();
  const update = {
    $set: {
      defectId: defectObjectId,
      method: input.method || 'FIVE_WHY',
      whyChain: Array.isArray(input.whyChain) ? input.whyChain : [],
      rootCause: String(input.rootCause || '').trim(),
      containment: String(input.containment || '').trim(),
      submittedByUserId: new ObjectId(actor.id),
      submittedAt: now,
      updatedAt: now,
    },
    $setOnInsert: {
      createdAt: now,
    },
  };

  const result = await db.collection('rca').findOneAndUpdate(
    { defectId: defectObjectId },
    update,
    { upsert: true, returnDocument: 'after' }
  );

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'RCA_UPSERTED',
    entityType: 'defect',
    entityId: defectId,
    meta: { method: update.$set.method },
  });

  // Often after RCA, defect goes to ACTION_REQUIRED; we do NOT force it, but we record if requested by caller.
  if (input.advanceDefectStatusTo) {
    await recordStatusChange({
      entityType: 'defect',
      entityId: defectId,
      fromStatus: existingDefect.status,
      toStatus: input.advanceDefectStatusTo,
      changedByUserId: actor.id,
      changedByRole: actor.role,
      note: 'RCA submitted - status advanced',
    });

    await db.collection('defects').updateOne(
      { _id: defectObjectId },
      { $set: { status: input.advanceDefectStatusTo, updatedAt: new Date() } }
    );
  }

  const rca = result.value;
  return {
    id: rca._id.toString(),
    defectId,
    method: rca.method,
    whyChain: rca.whyChain || [],
    rootCause: rca.rootCause || '',
    containment: rca.containment || '',
    submittedByUserId: rca.submittedByUserId ? rca.submittedByUserId.toString() : null,
    submittedAt: rca.submittedAt ? rca.submittedAt.toISOString() : null,
    updatedAt: rca.updatedAt ? rca.updatedAt.toISOString() : null,
  };
}

module.exports = {
  upsertRca,
};
