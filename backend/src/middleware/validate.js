// EcoSetu Express Validator Runner Middleware
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4, docs/05_API_SPECIFICATION.md

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Middleware factory to execute express-validator rules
 * @param {Array} validations - Array of validation chains
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Execute all validation chains
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedDetails = errors.array().map((err) => ({
      field: err.path || err.param || 'unknown',
      message: err.msg,
    }));

    return next(AppError.validation('Validation failed', formattedDetails));
  };
};

module.exports = validate;
