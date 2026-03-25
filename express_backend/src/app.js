const cors = require('cors');
const express = require('express');
const path = require('path');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');

// Initialize express app
const app = express();

/**
 * CORS configuration:
 * - Prefer explicit allowlist via env to support JWT auth flows safely.
 * - Falls back to "*" only if ALLOWED_ORIGINS is not set.
 *
 * Env (already present in container .env):
 * - ALLOWED_ORIGINS (comma-separated)
 * - ALLOWED_METHODS (comma-separated)
 * - ALLOWED_HEADERS (comma-separated)
 * - CORS_MAX_AGE (seconds)
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedMethods = (process.env.ALLOWED_METHODS || 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedHeaders = (process.env.ALLOWED_HEADERS || 'Content-Type,Authorization')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin:
    allowedOrigins.length === 0
      ? '*'
      : (origin, cb) => {
          // allow non-browser clients (no Origin header)
          if (!origin) return cb(null, true);
          if (allowedOrigins.includes(origin)) return cb(null, true);
          return cb(new Error(`CORS blocked for origin: ${origin}`));
        },
  methods: allowedMethods,
  allowedHeaders,
  credentials: true,
  maxAge: Number(process.env.CORS_MAX_AGE || 0) || undefined,
};

app.use(cors(corsOptions));
app.set('trust proxy', String(process.env.TRUST_PROXY || 'true').toLowerCase() === 'true');

app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host'); // may or may not include port
  let protocol = req.protocol; // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');

  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
      (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

/**
 * Serve uploaded files.
 * NOTE: Upload destination is configured by UPLOAD_DIR. Defaults to "<process.cwd()>/uploads".
 */
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir, { fallthrough: false }));

// Parse JSON request body
app.use(express.json({ limit: '2mb' }));

// Mount routes
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
});

module.exports = app;
