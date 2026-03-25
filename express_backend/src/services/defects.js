'use strict';

const { ObjectId } = require('mongodb');
const dayjs = require('dayjs');
const { getDb } = require('../db/mongo');
const { recordStatusChange } = require('./statusHistory');
const { writeAuditLog } = require('./audit');
const { toIsoOrNull } = require('../utils/http');

const DEFECT_STATUSES = Object.freeze([
  'OPEN',
  'IN_REVIEW',
  'ACTION_REQUIRED',
  'IN_ACTION',
  'VERIFICATION',
  'CLOSED',
]);

const SEVERITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// PUBLIC_INTERFACE
async function createDefect({ input, actor }) {
  /**
   * Create a new defect.
   */
  const db = getDb();
  const now = new Date();

  const doc = {
    title: String(input.title || '').trim(),
    description: String(input.description || '').trim(),
    defectType: String(input.defectType || '').trim(),
    severity: input.severity || 'MEDIUM',
    partNumber: String(input.partNumber || '').trim(),
    station: String(input.station || '').trim(),
    lotNumber: String(input.lotNumber || '').trim(),
    quantityAffected: Number(input.quantityAffected || 0),
    status: 'OPEN',
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    assignedToUserId: input.assignedToUserId ? new ObjectId(input.assignedToUserId) : null,
    createdByUserId: new ObjectId(actor.id),
    createdByRole: actor.role,
    createdAt: now,
    updatedAt: now,
    attachments: [], // {id, type, filename, mimeType, size, url, createdAt}
  };

  if (!doc.title) {
    const err = new Error('title is required');
    err.code = 'VALIDATION';
    throw err;
  }
  if (!DEFECT_STATUSES.includes(doc.status)) {
    const err = new Error('Invalid status');
    err.code = 'VALIDATION';
    throw err;
  }
  if (!SEVERITIES.includes(doc.severity)) {
    const err = new Error('Invalid severity');
    err.code = 'VALIDATION';
    throw err;
  }

  const result = await db.collection('defects').insertOne(doc);

  await recordStatusChange({
    entityType: 'defect',
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
    action: 'DEFECT_CREATED',
    entityType: 'defect',
    entityId: result.insertedId.toString(),
    meta: { title: doc.title, severity: doc.severity },
  });

  return await getDefectById(result.insertedId.toString());
}

// PUBLIC_INTERFACE
async function getDefectById(defectId) {
  /**
   * Get defect by id including linked RCA and corrective actions.
   */
  const db = getDb();
  const _id = new ObjectId(defectId);

  const defect = await db.collection('defects').findOne({ _id });
  if (!defect) return null;

  const [rca, actions] = await Promise.all([
    db.collection('rca').findOne({ defectId: _id }),
    db.collection('corrective_actions').find({ defectId: _id }).sort({ createdAt: -1 }).toArray(),
  ]);

  return normalizeDefect(defect, { rca, actions });
}

function normalizeDefect(defect, { rca, actions }) {
  return {
    id: defect._id.toString(),
    title: defect.title,
    description: defect.description,
    defectType: defect.defectType,
    severity: defect.severity,
    partNumber: defect.partNumber,
    station: defect.station,
    lotNumber: defect.lotNumber,
    quantityAffected: defect.quantityAffected,
    status: defect.status,
    dueDate: toIsoOrNull(defect.dueDate),
    assignedToUserId: defect.assignedToUserId ? defect.assignedToUserId.toString() : null,
    createdByUserId: defect.createdByUserId ? defect.createdByUserId.toString() : null,
    createdByRole: defect.createdByRole || null,
    createdAt: toIsoOrNull(defect.createdAt),
    updatedAt: toIsoOrNull(defect.updatedAt),
    attachments: defect.attachments || [],
    rca: rca
      ? {
        id: rca._id.toString(),
        method: rca.method || 'FIVE_WHY',
        whyChain: rca.whyChain || [],
        rootCause: rca.rootCause || '',
        containment: rca.containment || '',
        submittedByUserId: rca.submittedByUserId ? rca.submittedByUserId.toString() : null,
        submittedAt: toIsoOrNull(rca.submittedAt),
        updatedAt: toIsoOrNull(rca.updatedAt),
      }
      : null,
    correctiveActions: (actions || []).map((a) => ({
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
    })),
  };
}

// PUBLIC_INTERFACE
async function listDefects({ query, pagination }) {
  /**
   * List defects with filtering and basic search.
   */
  const db = getDb();
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.severity) filter.severity = query.severity;
  if (query.partNumber) filter.partNumber = query.partNumber;
  if (query.defectType) filter.defectType = query.defectType;
  if (query.station) filter.station = query.station;
  if (query.assignedToUserId) filter.assignedToUserId = new ObjectId(query.assignedToUserId);

  // Overdue: dueDate < now and not closed
  if (query.overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: 'CLOSED' };
  }

  // Simple text search
  if (query.q) {
    filter.$text = { $search: String(query.q) };
  }

  const sort = { createdAt: -1 };
  const cursor = db.collection('defects')
    .find(filter)
    .sort(sort)
    .skip(pagination.skip)
    .limit(pagination.limit);

  const [items, total] = await Promise.all([
    cursor.toArray(),
    db.collection('defects').countDocuments(filter),
  ]);

  return {
    items: items.map((d) => ({
      id: d._id.toString(),
      title: d.title,
      defectType: d.defectType,
      severity: d.severity,
      status: d.status,
      station: d.station,
      partNumber: d.partNumber,
      dueDate: toIsoOrNull(d.dueDate),
      assignedToUserId: d.assignedToUserId ? d.assignedToUserId.toString() : null,
      createdAt: toIsoOrNull(d.createdAt),
      updatedAt: toIsoOrNull(d.updatedAt),
      isOverdue: Boolean(d.dueDate && dayjs(d.dueDate).isBefore(dayjs()) && d.status !== 'CLOSED'),
    })),
    page: pagination.page,
    limit: pagination.limit,
    total,
  };
}

// PUBLIC_INTERFACE
async function updateDefect({ defectId, input, actor }) {
  /**
   * Update non-status fields on a defect.
   */
  const db = getDb();
  const _id = new ObjectId(defectId);
  const existing = await db.collection('defects').findOne({ _id });
  if (!existing) return null;

  const patch = {};
  const updatable = [
    'title',
    'description',
    'defectType',
    'severity',
    'partNumber',
    'station',
    'lotNumber',
    'quantityAffected',
    'dueDate',
    'assignedToUserId',
  ];
  for (const key of updatable) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      if (key === 'dueDate') patch.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      else if (key === 'assignedToUserId') patch.assignedToUserId = input.assignedToUserId ? new ObjectId(input.assignedToUserId) : null;
      else patch[key] = input[key];
    }
  }
  patch.updatedAt = new Date();

  await db.collection('defects').updateOne({ _id }, { $set: patch });

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'DEFECT_UPDATED',
    entityType: 'defect',
    entityId: defectId,
    meta: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt') },
  });

  return await getDefectById(defectId);
}

// PUBLIC_INTERFACE
async function changeDefectStatus({ defectId, toStatus, note, actor }) {
  /**
   * Transition a defect's status and record in history.
   */
  const db = getDb();
  const _id = new ObjectId(defectId);
  const defect = await db.collection('defects').findOne({ _id });
  if (!defect) return null;
  if (!DEFECT_STATUSES.includes(toStatus)) {
    const err = new Error('Invalid status');
    err.code = 'VALIDATION';
    throw err;
  }

  const fromStatus = defect.status;
  await recordStatusChange({
    entityType: 'defect',
    entityId: defectId,
    fromStatus,
    toStatus,
    changedByUserId: actor.id,
    changedByRole: actor.role,
    note: note || '',
  });

  await db.collection('defects').updateOne(
    { _id },
    { $set: { status: toStatus, updatedAt: new Date() } }
  );

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'DEFECT_STATUS_CHANGED',
    entityType: 'defect',
    entityId: defectId,
    meta: { fromStatus, toStatus, note: note || '' },
  });

  return await getDefectById(defectId);
}

// PUBLIC_INTERFACE
async function deleteDefect({ defectId, actor }) {
  /**
   * Delete a defect and its linked RCA/actions/history.
   */
  const db = getDb();
  const _id = new ObjectId(defectId);

  const defect = await db.collection('defects').findOne({ _id });
  if (!defect) return false;

  await Promise.all([
    db.collection('defects').deleteOne({ _id }),
    db.collection('rca').deleteOne({ defectId: _id }),
    db.collection('corrective_actions').deleteMany({ defectId: _id }),
    db.collection('status_history').deleteMany({ entityType: 'defect', entityId: _id }),
    db.collection('audit_logs').deleteMany({ entityType: 'defect', entityId: _id }),
  ]);

  await writeAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'DEFECT_DELETED',
    entityType: 'defect',
    entityId: defectId,
    meta: { title: defect.title },
  });

  return true;
}

module.exports = {
  DEFECT_STATUSES,
  SEVERITIES,
  createDefect,
  getDefectById,
  listDefects,
  updateDefect,
  changeDefectStatus,
  deleteDefect,
};
