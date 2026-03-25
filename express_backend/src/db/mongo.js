'use strict';

const { MongoClient } = require('mongodb');

let client;
let db;

/**
 * Parses and validates MongoDB configuration from environment variables.
 * Note: DB env vars come from the mongo_database container: MONGODB_URL, MONGODB_DB.
 */
function getMongoConfigFromEnv() {
  const mongoUrl = process.env.MONGODB_URL;
  const mongoDbName = process.env.MONGODB_DB;

  if (!mongoUrl) {
    throw new Error('Missing required env var: MONGODB_URL');
  }
  if (!mongoDbName) {
    throw new Error('Missing required env var: MONGODB_DB');
  }

  return { mongoUrl, mongoDbName };
}

/**
 * Creates collections and indexes needed for users, defects, RCA, corrective actions,
 * status history, and audit logs. This function is safe to run multiple times.
 */
async function ensureCollectionsAndIndexes(database) {
  // Create collections (idempotent)
  const existing = new Set((await database.listCollections().toArray()).map((c) => c.name));
  const collectionsToCreate = [
    'users',
    'defects',
    'rca',
    'corrective_actions',
    'status_history',
    'audit_logs',
  ];

  for (const name of collectionsToCreate) {
    if (!existing.has(name)) {
      await database.createCollection(name);
    }
  }

  // USERS
  await database.collection('users').createIndex(
    { email: 1 },
    { unique: true, name: 'uniq_email' }
  );
  await database.collection('users').createIndex(
    { role: 1, isActive: 1 },
    { name: 'role_active' }
  );

  // DEFECTS (Filtering + dashboards + overdue + search)
  await database.collection('defects').createIndex(
    { createdAt: -1 },
    { name: 'createdAt_desc' }
  );
  await database.collection('defects').createIndex(
    { status: 1, severity: 1, createdAt: -1 },
    { name: 'status_severity_createdAt' }
  );
  await database.collection('defects').createIndex(
    { partNumber: 1, createdAt: -1 },
    { name: 'part_createdAt' }
  );
  await database.collection('defects').createIndex(
    { defectType: 1, createdAt: -1 },
    { name: 'type_createdAt' }
  );
  await database.collection('defects').createIndex(
    { station: 1, createdAt: -1 },
    { name: 'station_createdAt' }
  );
  await database.collection('defects').createIndex(
    { assignedToUserId: 1, status: 1, dueDate: 1 },
    { name: 'assignee_status_due' }
  );
  await database.collection('defects').createIndex(
    { title: 'text', description: 'text', defectType: 'text', partNumber: 'text' },
    { name: 'defect_text_search', default_language: 'english' }
  );

  // RCA (1 per defect + lookup)
  await database.collection('rca').createIndex(
    { defectId: 1 },
    { unique: true, name: 'uniq_rca_per_defect' }
  );

  // CORRECTIVE ACTIONS (per defect & assignee, overdue)
  await database.collection('corrective_actions').createIndex(
    { defectId: 1, status: 1, dueDate: 1 },
    { name: 'ca_defect_status_due' }
  );
  await database.collection('corrective_actions').createIndex(
    { assignedToUserId: 1, status: 1, dueDate: 1 },
    { name: 'ca_assignee_status_due' }
  );

  // STATUS HISTORY (timelines)
  await database.collection('status_history').createIndex(
    { entityType: 1, entityId: 1, changedAt: -1 },
    { name: 'entity_changedAt_desc' }
  );

  // AUDIT LOGS (auditing & reporting)
  await database.collection('audit_logs').createIndex(
    { entityType: 1, entityId: 1, createdAt: -1 },
    { name: 'audit_entity_createdAt' }
  );
  await database.collection('audit_logs').createIndex(
    { actorUserId: 1, createdAt: -1 },
    { name: 'audit_actor_createdAt' }
  );
  await database.collection('audit_logs').createIndex(
    { action: 1, createdAt: -1 },
    { name: 'audit_action_createdAt' }
  );
}

// PUBLIC_INTERFACE
async function connectMongo() {
  /**
   * Connect to MongoDB and ensure required collections/indexes exist.
   * @returns {Promise<import('mongodb').Db>} Connected MongoDB Db instance.
   */
  if (db) return db;

  const { mongoUrl, mongoDbName } = getMongoConfigFromEnv();

  client = new MongoClient(mongoUrl, {
    // Keep these defaults explicit for clarity; can be tuned later.
    maxPoolSize: 10,
  });

  await client.connect();
  db = client.db(mongoDbName);

  await ensureCollectionsAndIndexes(db);

  return db;
}

// PUBLIC_INTERFACE
function getDb() {
  /**
   * Get the connected MongoDB Db handle.
   * Must call connectMongo() once at startup before using this.
   */
  if (!db) {
    throw new Error('MongoDB is not connected. Call connectMongo() during startup.');
  }
  return db;
}

// PUBLIC_INTERFACE
async function closeMongo() {
  /**
   * Close MongoDB connection gracefully.
   */
  if (client) {
    await client.close();
  }
  client = undefined;
  db = undefined;
}

module.exports = {
  connectMongo,
  getDb,
  closeMongo,
};
