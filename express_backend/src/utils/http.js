'use strict';

// PUBLIC_INTERFACE
function parsePagination(query) {
  /**
   * Parse pagination params from query.
   * @param {object} query Express query object.
   * @returns {{limit:number, skip:number, page:number}}
   */
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// PUBLIC_INTERFACE
function toIsoOrNull(value) {
  /**
   * Convert date-like value to ISO string, or null if falsy/invalid.
   * @param {any} value
   * @returns {string|null}
   */
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// PUBLIC_INTERFACE
function badRequest(res, message, details) {
  /**
   * Send 400 response.
   */
  return res.status(400).json({ status: 'error', message, details });
}

// PUBLIC_INTERFACE
function notFound(res, message) {
  /**
   * Send 404 response.
   */
  return res.status(404).json({ status: 'error', message: message || 'Not found' });
}

module.exports = {
  parsePagination,
  toIsoOrNull,
  badRequest,
  notFound,
};
