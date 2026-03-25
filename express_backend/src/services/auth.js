'use strict';

const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');
const { ROLES, hashPassword, verifyPassword, signAccessToken } = require('../auth');
const { writeAuditLog } = require('./audit');

// PUBLIC_INTERFACE
async function registerUser({ email, password, role, name }) {
  /**
   * Register a new user (intended for initial setup or admin scripts).
   * Note: for simplicity, this endpoint will be protected by PRODUCTION_SUPERVISOR role.
   */
  const db = getDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    const err = new Error('Email is required');
    err.code = 'VALIDATION';
    throw err;
  }
  if (!password || String(password).length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.code = 'VALIDATION';
    throw err;
  }
  if (![ROLES.QUALITY_ENGINEER, ROLES.PRODUCTION_SUPERVISOR].includes(role)) {
    const err = new Error('Invalid role');
    err.code = 'VALIDATION';
    throw err;
  }

  const passwordHash = await hashPassword(password);

  const now = new Date();
  const doc = {
    email: normalizedEmail,
    passwordHash,
    role,
    name: name || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('users').insertOne(doc);

  await writeAuditLog({
    actorUserId: null,
    actorRole: null,
    action: 'USER_REGISTERED',
    entityType: 'user',
    entityId: result.insertedId.toString(),
    meta: { email: normalizedEmail, role },
  });

  return { id: result.insertedId.toString(), email: normalizedEmail, role, name: doc.name };
}

// PUBLIC_INTERFACE
async function login({ email, password }) {
  /**
   * Authenticate a user and return access token.
   */
  const db = getDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await db.collection('users').findOne({ email: normalizedEmail, isActive: { $ne: false } });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.code = 'AUTH';
    throw err;
  }

  const ok = await verifyPassword(password || '', user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.code = 'AUTH';
    throw err;
  }

  const token = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  await writeAuditLog({
    actorUserId: user._id.toString(),
    actorRole: user.role,
    action: 'USER_LOGIN',
    entityType: 'user',
    entityId: user._id.toString(),
    meta: {},
  });

  return {
    accessToken: token,
    user: { id: user._id.toString(), email: user.email, role: user.role, name: user.name || '' },
  };
}

// PUBLIC_INTERFACE
async function getMe(userId) {
  /**
   * Get current user profile.
   */
  const db = getDb();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId), isActive: { $ne: false } },
    { projection: { passwordHash: 0 } }
  );
  if (!user) return null;
  return { id: user._id.toString(), email: user.email, role: user.role, name: user.name || '' };
}

module.exports = {
  registerUser,
  login,
  getMe,
};
