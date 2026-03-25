'use strict';

const dayjs = require('dayjs');
const { getDb } = require('../db/mongo');
const { toIsoOrNull } = require('../utils/http');

// PUBLIC_INTERFACE
async function getOverdue({ limit = 50 }) {
  /**
   * Get overdue defects and corrective actions (compact lists).
   */
  const db = getDb();
  const now = new Date();

  const [defects, actions] = await Promise.all([
    db.collection('defects')
      .find({ dueDate: { $lt: now }, status: { $ne: 'CLOSED' } })
      .sort({ dueDate: 1 })
      .limit(Math.min(200, Number(limit) || 50))
      .toArray(),
    db.collection('corrective_actions')
      .find({ dueDate: { $lt: now }, status: { $nin: ['DONE', 'CANCELLED'] } })
      .sort({ dueDate: 1 })
      .limit(Math.min(200, Number(limit) || 50))
      .toArray(),
  ]);

  return {
    defects: defects.map((d) => ({
      id: d._id.toString(),
      title: d.title,
      status: d.status,
      severity: d.severity,
      dueDate: toIsoOrNull(d.dueDate),
      daysOverdue: d.dueDate ? dayjs().diff(dayjs(d.dueDate), 'day') : null,
    })),
    correctiveActions: actions.map((a) => ({
      id: a._id.toString(),
      defectId: a.defectId.toString(),
      title: a.title,
      status: a.status,
      dueDate: toIsoOrNull(a.dueDate),
      daysOverdue: a.dueDate ? dayjs().diff(dayjs(a.dueDate), 'day') : null,
    })),
  };
}

module.exports = {
  getOverdue,
};
