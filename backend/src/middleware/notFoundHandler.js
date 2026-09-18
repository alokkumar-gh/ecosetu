// EcoSetu 404 Route Not Found Middleware
// Canonical Reference: docs/05_API_SPECIFICATION.md, docs/10_BACKEND_ARCHITECTURE.md

const { ERROR_CODES } = require('../utils/constants');

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
  });
};

module.exports = notFoundHandler;
