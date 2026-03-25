'use strict';

const alertsService = require('../services/alerts');

class AlertsController {
  async overdue(req, res) {
    const data = await alertsService.getOverdue({ limit: Number(req.query.limit || 50) });
    return res.status(200).json({ status: 'ok', ...data });
  }
}

module.exports = new AlertsController();
