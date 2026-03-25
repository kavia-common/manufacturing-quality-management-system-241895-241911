'use strict';

require('dotenv').config();

const app = require('./app');
const { connectMongo, closeMongo } = require('./db/mongo');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

let server;

// PUBLIC_INTERFACE
async function start() {
  /**
   * Backend entrypoint: connects to MongoDB (and ensures collections/indexes),
   * then starts the HTTP server.
   */
  await connectMongo();

  server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
      try {
        await closeMongo();
      } catch (e) {
        console.error('Error closing MongoDB connection', e);
      }
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

start().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});

module.exports = server;
