// EcoSetu Custom Application Error
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/05_API_SPECIFICATION.md

const { ERROR_CODES } = require('./constants');

class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 403, 404, 409, 500)
   * @param {string} code - Error code enum string (e.g. VALIDATION_ERROR, NOT_FOUND)
   * @param {Array|Object|null} details - Optional structured error details
   */
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = ERROR_CODES.BAD_REQUEST, details = null) {
    return new AppError(message, 400, code, details);
  }

  static validation(message, details = null) {
    return new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static unauthorized(message = 'Missing or invalid authentication token') {
    return new AppError(message, 401, ERROR_CODES.UNAUTHORIZED);
  }

  static forbidden(message = 'Insufficient permissions to perform this action') {
    return new AppError(message, 403, ERROR_CODES.FORBIDDEN);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, ERROR_CODES.NOT_FOUND);
  }

  static conflict(message = 'Resource state conflict') {
    return new AppError(message, 409, ERROR_CODES.CONFLICT);
  }

  static rateLimited(message = 'Too many requests. Please try again later.') {
    return new AppError(message, 429, ERROR_CODES.RATE_LIMITED);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500, ERROR_CODES.INTERNAL_ERROR);
  }

  static serviceUnavailable(message = 'AI service is currently unavailable. Please select category manually.') {
    return new AppError(message, 503, ERROR_CODES.SERVICE_UNAVAILABLE);
  }
}

module.exports = AppError;
