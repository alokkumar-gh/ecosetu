// EcoSetu Centralized Error Handler Middleware
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4.4, docs/05_API_SPECIFICATION.md

const logger = require('../config/logger');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../utils/constants');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // 1. Handle JSON Parsing Syntax Errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = AppError.badRequest('Malformed JSON in request body', ERROR_CODES.VALIDATION_ERROR);
  }

  // 2. Handle Prisma Known Request Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const target = err.meta && err.meta.target ? ` on field (${err.meta.target})` : '';
      error = AppError.conflict(`A record with this unique attribute already exists${target}`);
    }
    // Record to update/delete not found
    else if (err.code === 'P2025') {
      error = AppError.notFound(err.meta?.cause || 'Requested database record not found');
    }
    // Foreign key constraint failed
    else if (err.code === 'P2003') {
      error = AppError.badRequest('Referenced entity does not exist', ERROR_CODES.VALIDATION_ERROR);
    }
    // Missing table (P2021) or missing column (P2022) in database schema
    else if (err.code === 'P2021' || err.code === 'P2022') {
      logger.error(`[Database Schema Error] ${err.code}: ${err.message}`, { code: err.code, meta: err.meta });
      error = AppError.internal('Database schema mismatch. Please ensure all migrations are applied.');
    } else {
      logger.error(`[Prisma Known Error] ${err.code}: ${err.message}`, { code: err.code, meta: err.meta });
      error = AppError.badRequest('Database request error', ERROR_CODES.BAD_REQUEST);
    }
  }

  // 3. Handle Prisma Validation Errors
  if (err.name === 'PrismaClientValidationError') {
    error = AppError.validation('Database query validation error');
  }

  // 4. Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = AppError.unauthorized('Invalid authentication token signature');
  }
  if (err.name === 'TokenExpiredError') {
    error = AppError.unauthorized('Authentication token has expired');
  }

  // 5. Handle Multer Upload Errors
  if (err.name === 'MulterError') {
    error = AppError.badRequest(`File upload error: ${err.message}`, ERROR_CODES.VALIDATION_ERROR);
  }

  // Extract response attributes
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || ERROR_CODES.INTERNAL_ERROR;
  const message =
    statusCode === 500 && environment.isProduction
      ? 'An unexpected internal error occurred'
      : error.message || 'Internal server error';

  // Log error with appropriate level
  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${err.message}`, {
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
      code: errorCode,
      ip: req.ip,
    });
  } else {
    logger.warn(`[Client Error] ${statusCode} - ${message}`, {
      path: req.originalUrl,
      method: req.method,
      code: errorCode,
      details: error.details,
    });
  }

  // Construct standard error payload matching docs/05_API_SPECIFICATION.md
  const responsePayload = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };

  if (error.details) {
    responsePayload.error.details = error.details;
  }

  // Include stack trace only in development
  if (!environment.isProduction && statusCode === 500 && err.stack) {
    responsePayload.error.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;
