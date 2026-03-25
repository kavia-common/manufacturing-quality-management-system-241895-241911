'use strict';

const express = require('express');
const healthController = require('../controllers/health');

const authRoutes = require('./auth');
const defectRoutes = require('./defects');
const correctiveActionRoutes = require('./correctiveActions');
const dashboardRoutes = require('./dashboard');
const alertsRoutes = require('./alerts');
const uploadRoutes = require('./uploads');
const pdfRoutes = require('./pdf');

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

// API routes
router.use('/api/auth', authRoutes);
router.use('/api/defects', defectRoutes);
router.use('/api/actions', correctiveActionRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/alerts', alertsRoutes);
router.use('/api', uploadRoutes);
router.use('/api/export', pdfRoutes);

module.exports = router;
