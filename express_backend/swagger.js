const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Manufacturing Quality Management API',
      version: '1.0.0',
      description: 'REST API for defects, RCA, corrective actions, dashboards, uploads, and audit exports with role-based access control.',
    },
    tags: [
      { name: 'System', description: 'System endpoints' },
      { name: 'Auth', description: 'Authentication and user identity' },
      { name: 'Defects', description: 'Defect logging and lifecycle management' },
      { name: 'CorrectiveActions', description: 'Corrective actions CRUD and status transitions' },
      { name: 'Dashboard', description: 'KPI and analytics aggregations' },
      { name: 'Alerts', description: 'Overdue alerts' },
      { name: 'Uploads', description: 'File/image uploads attached to defects' },
      { name: 'Export', description: 'PDF export endpoints' },
    ],
  },
  apis: ['./src/routes/*.js'], // Swagger JSDoc comments live in route files
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
