'use strict';

const express = require('express');
const defectsController = require('../controllers/defects');
const rcaController = require('../controllers/rca');
const correctiveActionsController = require('../controllers/correctiveActions');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Defects
 *     description: Defect logging and lifecycle management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Defect:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         title: { type: string }
 *         description: { type: string }
 *         defectType: { type: string }
 *         severity: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *         partNumber: { type: string }
 *         station: { type: string }
 *         lotNumber: { type: string }
 *         quantityAffected: { type: integer }
 *         status: { type: string, enum: [OPEN, IN_REVIEW, ACTION_REQUIRED, IN_ACTION, VERIFICATION, CLOSED] }
 *         dueDate: { type: string, format: date-time, nullable: true }
 *         assignedToUserId: { type: string, nullable: true }
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               type: { type: string, enum: [IMAGE, FILE] }
 *               filename: { type: string }
 *               mimeType: { type: string }
 *               size: { type: integer }
 *               url: { type: string }
 *               createdAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /api/defects:
 *   get:
 *     tags: [Defects]
 *     summary: List defects (filter/search)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: overdue
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated defects
 *   post:
 *     tags: [Defects]
 *     summary: Create defect (Quality Engineer only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               defectType: { type: string }
 *               severity: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *               partNumber: { type: string }
 *               station: { type: string }
 *               lotNumber: { type: string }
 *               quantityAffected: { type: integer }
 *               dueDate: { type: string, format: date-time }
 *               assignedToUserId: { type: string }
 *     responses:
 *       201:
 *         description: Created defect
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 defect: { $ref: '#/components/schemas/Defect' }
 */
router.get('/', requireAuth, defectsController.list.bind(defectsController));
router.post(
  '/',
  requireAuth,
  requireRole([ROLES.QUALITY_ENGINEER]),
  defectsController.create.bind(defectsController)
);

/**
 * @swagger
 * /api/defects/{id}:
 *   get:
 *     tags: [Defects]
 *     summary: Get defect detail (includes RCA and corrective actions)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Defect detail
 *   put:
 *     tags: [Defects]
 *     summary: Update defect (Quality Engineer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated defect
 *   delete:
 *     tags: [Defects]
 *     summary: Delete defect (Production Supervisor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.get('/:id', requireAuth, defectsController.getById.bind(defectsController));
router.put(
  '/:id',
  requireAuth,
  requireRole([ROLES.QUALITY_ENGINEER]),
  defectsController.update.bind(defectsController)
);
router.delete(
  '/:id',
  requireAuth,
  requireRole([ROLES.PRODUCTION_SUPERVISOR]),
  defectsController.remove.bind(defectsController)
);

/**
 * @swagger
 * /api/defects/{id}/status:
 *   patch:
 *     tags: [Defects]
 *     summary: Change defect status (Quality Engineer only)
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
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_REVIEW, ACTION_REQUIRED, IN_ACTION, VERIFICATION, CLOSED]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated defect with new status
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole([ROLES.QUALITY_ENGINEER]),
  defectsController.changeStatus.bind(defectsController)
);

/**
 * @swagger
 * /api/defects/{defectId}/rca:
 *   put:
 *     tags: [Defects]
 *     summary: Upsert RCA for a defect (Quality Engineer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: defectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method: { type: string, example: FIVE_WHY }
 *               whyChain:
 *                 type: array
 *                 items: { type: string }
 *               rootCause: { type: string }
 *               containment: { type: string }
 *               advanceDefectStatusTo:
 *                 type: string
 *                 enum: [OPEN, IN_REVIEW, ACTION_REQUIRED, IN_ACTION, VERIFICATION, CLOSED]
 *     responses:
 *       200:
 *         description: RCA updated
 */
router.put(
  '/:defectId/rca',
  requireAuth,
  requireRole([ROLES.QUALITY_ENGINEER]),
  rcaController.upsert.bind(rcaController)
);

/**
 * @swagger
 * /api/defects/{defectId}/actions:
 *   post:
 *     tags: [Defects]
 *     summary: Create corrective action for defect (Quality Engineer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: defectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Created corrective action
 */
router.post(
  '/:defectId/actions',
  requireAuth,
  requireRole([ROLES.QUALITY_ENGINEER]),
  correctiveActionsController.create.bind(correctiveActionsController)
);

module.exports = router;
