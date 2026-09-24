// EcoSetu Universal Validator Runner Middleware (Supports Joi Schemas & express-validator chains)
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4, docs/05_API_SPECIFICATION.md

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Middleware factory to execute express-validator rules or Joi schemas
 * @param {Array|Object} validations - Array of validation chains or Joi Schema
 * @param {string} [source='body'] - Property of req to validate for Joi (body, query, params)
 */
const validate = (validations, source = 'body') => {
  return async (req, res, next) => {
    if (!validations) {
      return next();
    }

    // Support Joi Schema objects
    if (typeof validations.validate === 'function') {
      const target = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
      const { error, value } = validations.validate(target, {
        abortEarly: false,
        stripUnknown: false,
      });

      if (error) {
        const formattedDetails = error.details.map((detail) => ({
          field: detail.path.join('.') || 'unknown',
          message: detail.message,
        }));
        return next(AppError.validation('Validation failed', formattedDetails));
      }

      if (source === 'query') req.query = value;
      else if (source === 'params') req.params = value;
      else req.body = value;

      return next();
    }

    // Support express-validator array or single chain
    const chains = Array.isArray(validations) ? validations : [validations];
    await Promise.all(chains.map((chain) => (typeof chain.run === 'function' ? chain.run(req) : null)));

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
