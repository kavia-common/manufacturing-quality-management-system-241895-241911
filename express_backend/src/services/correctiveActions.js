'use strict';

const { ObjectId } = require('mongodb');
const dayjs = require('dayjs');
const { getDb } = require('../db/mongo');
const { recordStatusChange } = require('./statusHistory');
const { writeAuditLog } = require('./audit');
const { toIsoOrNull } = require('../utils/http');

const CA_STATUSES = Object.freeze(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']);

// PUBLIC_INTERFACE
async function createCorrectiveAction({ defectId, input, actor }) {
  /**
   * Create a corrective action linked to a defect.
   */
  const db = getDb();

  const defect = await db.collection('defects').findOne({ _id: new ObjectId(defectId) });
  if (!defect) {
    const err = new Error('Defect not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date();
  const doc = {
    defectId: new ObjectId(defectId),
    title: String(input.title || '').trim(),
    owner: String(input.owner || '').trim(),
    assignedToUserId: input.assignedToUserId ? new ObjectId(input.assignedToUserId) : null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    status: input.status || 'OPEN',
    notes: String(input.notes || '').trim(),
    createdByUserId: new ObjectId(actor.id),
    createdByRole: actor.role,
    createdAt: now,
    updatedAt: now,
  };

  if (!doc.title) {
    const err = new Error('title is required');
    err.code = 'VALIDATION';
    throw err;
  }
  if (!CA_STATUSES.includes(doc.status)) {
    const err = new Error('Invalid status');
    err.code = 'VALIDATION';
    throw err;
  }

  const result = await db.collection('corrective_actions').insertOne(doc);

  await recordStatusChange({
    entityType: 'corrective_action',
    entityId: result.insertedId.toString(),
    fromStatus: null,
    toStatus: doc.status,
    changedByUserId: actor.id,
    changedByRole: actor.role,
    note: 'Created',
  });

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'CORRECTIVE_ACTION_CREATED',
    entityType: 'corrective_action',
    entityId: result.insertedId.toString(),
    meta: { defectId, title: doc.title },
  });

  return await getCorrectiveActionById(result.insertedId.toString());
}

// PUBLIC_INTERFACE
async function getCorrectiveActionById(actionId) {
  /**
   * Get corrective action by id.
   */
  const db = getDb();
  const a = await db.collection('corrective_actions').findOne({ _id: new ObjectId(actionId) });
  if (!a) return null;
  return normalize(a);
}

function normalize(a) {
  return {
    id: a._id.toString(),
    defectId: a.defectId.toString(),
    title: a.title,
    owner: a.owner || '',
    assignedToUserId: a.assignedToUserId ? a.assignedToUserId.toString() : null,
    dueDate: toIsoOrNull(a.dueDate),
    status: a.status,
    notes: a.notes || '',
    createdAt: toIsoOrNull(a.createdAt),
    updatedAt: toIsoOrNull(a.updatedAt),
    isOverdue: Boolean(a.dueDate && dayjs(a.dueDate).isBefore(dayjs()) && !['DONE', 'CANCELLED'].includes(a.status)),
  };
}

// PUBLIC_INTERFACE
async function updateCorrectiveAction({ actionId, input, actor }) {
  /**
   * Update corrective action fields (except status).
   */
  const db = getDb();
  const _id = new ObjectId(actionId);

  const existing = await db.collection('corrective_actions').findOne({ _id });
  if (!existing) return null;

  const patch = {};
  const updatable = ['title', 'owner', 'assignedToUserId', 'dueDate', 'notes'];
  for (const key of updatable) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      if (key === 'assignedToUserId') patch.assignedToUserId = input.assignedToUserId ? new ObjectId(input.assignedToUserId) : null;
      else if (key === 'dueDate') patch.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      else patch[key] = input[key];
    }
  }
  patch.updatedAt = new Date();

  await db.collection('corrective_actions').updateOne({ _id }, { $set: patch });

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'CORRECTIVE_ACTION_UPDATED',
    entityType: 'corrective_action',
    entityId: actionId,
    meta: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt') },
  });

  return await getCorrectiveActionById(actionId);
}

// PUBLIC_INTERFACE
async function changeCorrectiveActionStatus({ actionId, toStatus, note, actor }) {
  /**
   * Transition corrective action status.
   */
  const db = getDb();
  const _id = new ObjectId(actionId);
  const action = await db.collection('corrective_actions').findOne({ _id });
  if (!action) return null;

  if (!CA_STATUSES.includes(toStatus)) {
    const err = new Error('Invalid status');
    err.code = 'VALIDATION';
    throw err;
  }

  const fromStatus = action.status;

  await recordStatusChange({
    entityType: 'corrective_action',
    entityId: actionId,
    fromStatus,
    toStatus,
    changedByUserId: actor.id,
    changedByRole: actor.role,
    note: note || '',
  });

  await db.collection('corrective_actions').updateOne(
    { _id },
    { $set: { status: toStatus, updatedAt: new Date() } }
  );

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'CORRECTIVE_ACTION_STATUS_CHANGED',
    entityType: 'corrective_action',
    entityId: actionId,
    meta: { fromStatus, toStatus, note: note || '' },
  });

  return await getCorrectiveActionById(actionId);
}

// PUBLIC_INTERFACE
async function deleteCorrectiveAction({ actionId, actor }) {
  /**
   * Delete corrective action and status history.
   */
  const db = getDb();
  const _id = new ObjectId(actionId);
  const action = await db.collection('corrective_actions').findOne({ _id });
  if (!action) return false;

  await Promise.all([
    db.collection('corrective_actions').deleteOne({ _id }),
    db.collection('status_history').deleteMany({ entityType: 'corrective_action', entityId: _id }),
    db.collection('audit_logs').deleteMany({ entityType: 'corrective_action', entityId: _id }),
  ]);

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'CORRECTIVE_ACTION_DELETED',
    entityType: 'corrective_action',
    entityId: actionId,
    meta: { defectId: action.defectId.toString(), title: action.title },
  });

  return true;
}

module.exports = {
  CA_STATUSES,
  createCorrectiveAction,
  getCorrectiveActionById,
  updateCorrectiveAction,
  changeCorrectiveActionStatus,
  deleteCorrectiveAction,
};
