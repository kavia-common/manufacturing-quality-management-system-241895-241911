'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ROLES = Object.freeze({
  QUALITY_ENGINEER: 'QUALITY_ENGINEER',
  PRODUCTION_SUPERVISOR: 'PRODUCTION_SUPERVISOR',
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing required env var: JWT_SECRET');
  }
  return secret;
}

// PUBLIC_INTERFACE
function signAccessToken(payload) {
  /**
   * Sign a short-lived access token for API authentication.
   * @param {object} payload Token payload (will be embedded as claims).
   * @returns {string} JWT access token.
   */
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  return jwt.sign(payload, secret, { expiresIn });
}

// PUBLIC_INTERFACE
function verifyAccessToken(token) {
  /**
   * Verify a JWT access token and return its decoded payload.
   * @param {string} token JWT token (without "Bearer " prefix).
   * @returns {object} Decoded payload.
   */
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}

// PUBLIC_INTERFACE
async function hashPassword(plainPassword) {
  /**
   * Hash a password for storage.
   * @param {string} plainPassword plaintext password.
   * @returns {Promise<string>} bcrypt hash.
   */
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
  return bcrypt.hash(plainPassword, saltRounds);
}

// PUBLIC_INTERFACE
async function verifyPassword(plainPassword, passwordHash) {
  /**
   * Compare plaintext password against stored bcrypt hash.
   * @param {string} plainPassword plaintext password.
   * @param {string} passwordHash bcrypt hash from DB.
   * @returns {Promise<boolean>} true if matches.
   */
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  ROLES,
  signAccessToken,
  verifyAccessToken,
  hashPassword,
  verifyPassword,
};
