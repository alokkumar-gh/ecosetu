// EcoSetu HTTP Request Logger Middleware
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 8

const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  // Log on response completion
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const { statusCode } = res;
    const userId = req.user ? req.user.id : 'anonymous';

    const logMeta = {
      method,
      path: originalUrl,
      status: statusCode,
      durationMs,
      ip,
      userId,
    };

    if (statusCode >= 500) {
      logger.error(`[HTTP] ${method} ${originalUrl} ${statusCode} - ${durationMs}ms`, logMeta);
    } else if (statusCode >= 400) {
      logger.warn(`[HTTP] ${method} ${originalUrl} ${statusCode} - ${durationMs}ms`, logMeta);
    } else {
      logger.info(`[HTTP] ${method} ${originalUrl} ${statusCode} - ${durationMs}ms`, logMeta);
    }
  });

  next();
};

module.exports = requestLogger;
