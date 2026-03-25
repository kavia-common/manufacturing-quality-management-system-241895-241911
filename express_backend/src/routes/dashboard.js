'use strict';

const express = require('express');
const dashboardController = require('../controllers/dashboard');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Dashboard
 *     description: KPI and analytics aggregations
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Dashboard aggregation summary (KPIs, Pareto, trends)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 365, example: 30 }
 *     responses:
 *       200:
 *         description: Dashboard summary
 */
router.get('/summary', requireAuth, dashboardController.summary.bind(dashboardController));

module.exports = router;
