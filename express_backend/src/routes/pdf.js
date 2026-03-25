'use strict';

const express = require('express');
const pdfController = require('../controllers/pdf');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Export
 *     description: PDF export endpoints
 */

/**
 * @swagger
 * /api/export/defects/{defectId}/audit.pdf:
 *   get:
 *     tags: [Export]
 *     summary: Download a defect audit PDF report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: defectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Defect not found
 */
router.get('/defects/:defectId/audit.pdf', requireAuth, pdfController.defectAuditReport.bind(pdfController));

module.exports = router;
