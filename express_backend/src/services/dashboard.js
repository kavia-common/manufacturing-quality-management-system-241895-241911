'use strict';

const dayjs = require('dayjs');
const { getDb } = require('../db/mongo');

// PUBLIC_INTERFACE
async function getDashboardSummary({ days = 30 }) {
  /**
   * Return dashboard aggregation metrics:
   * - counts by status, severity
   * - overdue counts
   * - pareto by defectType
   * - daily trend (created count)
   */
  const db = getDb();
  const since = dayjs().subtract(Number(days) || 30, 'day').toDate();
  const now = new Date();

  const defects = db.collection('defects');
  const correctiveActions = db.collection('corrective_actions');

  const [
    byStatus,
    bySeverity,
    overdueDefects,
    overdueActions,
    paretoTypes,
    trendDaily,
  ] = await Promise.all([
    defects.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    defects.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    defects.countDocuments({ dueDate: { $lt: now }, status: { $ne: 'CLOSED' } }),
    correctiveActions.countDocuments({ dueDate: { $lt: now }, status: { $nin: ['DONE', 'CANCELLED'] } }),
    defects.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$defectType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray(),
    defects.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  return {
    windowDays: Number(days) || 30,
    defects: {
      byStatus: byStatus.map((x) => ({ status: x._id || 'UNKNOWN', count: x.count })),
      bySeverity: bySeverity.map((x) => ({ severity: x._id || 'UNKNOWN', count: x.count })),
      overdueCount: overdueDefects,
      paretoByType: paretoTypes.map((x) => ({ defectType: x._id || 'Unknown', count: x.count })),
      trendDaily: trendDaily.map((x) => ({ date: x._id, count: x.count })),
    },
    correctiveActions: {
      overdueCount: overdueActions,
    },
  };
}

module.exports = {
  getDashboardSummary,
};
