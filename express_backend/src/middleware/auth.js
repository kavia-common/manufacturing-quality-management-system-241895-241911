'use strict';

const { ObjectId } = require('mongodb');
const { verifyAccessToken } = require('../auth');
const { getDb } = require('../db/mongo');

/**
 * Extract Bearer token from the Authorization header.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractBearer(req) {
  const header = req.get('authorization') || req.get('Authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

// PUBLIC_INTERFACE
async function requireAuth(req, res, next) {
  /**
   * Express middleware: require a valid JWT access token.
   * Attaches `req.user` with { id, email, role }.
   */
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Missing Bearer token' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ status: 'error', message: 'Invalid token' });
    }

    // Optional: ensure user still exists & active
    const db = getDb();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.sub), isActive: { $ne: false } },
      { projection: { passwordHash: 0 } }
    );
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User not found or inactive' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name || '',
    };

    return next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
}

// PUBLIC_INTERFACE
function requireRole(allowedRoles) {
  /**
   * Express middleware factory: require a user role.
   * @param {string[]} allowedRoles list of allowed role strings.
   */
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
