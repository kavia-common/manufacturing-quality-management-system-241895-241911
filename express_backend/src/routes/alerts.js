'use strict';

const express = require('express');
const alertsController = require('../controllers/alerts');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Alerts
 *     description: Overdue alerts
 */

/**
 * @swagger
 * /api/alerts/overdue:
 *   get:
 *     tags: [Alerts]
 *     summary: Get overdue defects and corrective actions
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200, example: 50 }
 *     responses:
 *       200:
 *         description: Overdue alerts
 */
router.get('/overdue', requireAuth, alertsController.overdue.bind(alertsController));

module.exports = router;
