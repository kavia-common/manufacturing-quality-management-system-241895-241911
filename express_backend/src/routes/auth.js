'use strict';

const express = require('express');
const authController = require('../controllers/auth');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication and user identity
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status: { type: string, example: error }
 *         message: { type: string, example: Internal Server Error }
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, example: qe1@factory.local }
 *         password: { type: string, example: ChangeMe123! }
 *     LoginResponse:
 *       type: object
 *       properties:
 *         status: { type: string, example: ok }
 *         accessToken: { type: string }
 *         user:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             email: { type: string }
 *             role: { type: string }
 *             name: { type: string }
 *     RegisterRequest:
 *       type: object
 *       required: [email, password, role]
 *       properties:
 *         email: { type: string }
 *         password: { type: string, minLength: 8 }
 *         role:
 *           type: string
 *           enum: [QUALITY_ENGINEER, PRODUCTION_SUPERVISOR]
 *         name: { type: string }
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and obtain access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LoginResponse' }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (Production Supervisor only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201:
 *         description: User created
 *       403:
 *         description: Forbidden
 */
router.post(
  '/register',
  requireAuth,
  requireRole([ROLES.PRODUCTION_SUPERVISOR]),
  authController.register.bind(authController)
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user info
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user
 */
router.get('/me', requireAuth, authController.me.bind(authController));

module.exports = router;
