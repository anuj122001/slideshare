const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
