'use strict';

const dashboardService = require('../services/dashboard');

class DashboardController {
  async summary(req, res) {
    const days = Number(req.query.days || 30);
    const data = await dashboardService.getDashboardSummary({ days });
    return res.status(200).json({ status: 'ok', dashboard: data });
  }
}

module.exports = new DashboardController();
