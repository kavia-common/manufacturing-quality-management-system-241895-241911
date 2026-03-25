'use strict';

const express = require('express');
const correctiveActionsController = require('../controllers/correctiveActions');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: CorrectiveActions
 *     description: Corrective actions CRUD and status transitions
 */

/**
 * @swagger
 * /api/actions/{id}:
 *   get:
 *     tags: [CorrectiveActions]
 *     summary: Get a corrective action
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *   put:
 *     tags: [CorrectiveActions]
 *     summary: Update a corrective action (Quality Engineer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *   delete:
 *     tags: [CorrectiveActions]
 *     summary: Delete a corrective action (Production Supervisor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 */
router.get('/:id', requireAuth, correctiveActionsController.getById.bind(correctiveActionsController));
router.put(
  '/:id',
  requireAuth,
  requireRole([ROLES.QUALITY_ENGINEER]),
  correctiveActionsController.update.bind(correctiveActionsController)
);
router.delete(
  '/:id',
  requireAuth,
  requireRole([ROLES.PRODUCTION_SUPERVISOR]),
  correctiveActionsController.remove.bind(correctiveActionsController)
);

/**
 * @swagger
 * /api/actions/{id}/status:
 *   patch:
 *     tags: [CorrectiveActions]
 *     summary: Change corrective action status (Quality Engineer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [OPEN, IN_PROGRESS, DONE, CANCELLED] }
 *               note: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole([ROLES.QUALITY_ENGINEER]),
  correctiveActionsController.changeStatus.bind(correctiveActionsController)
);

module.exports = router;
