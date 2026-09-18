// EcoSetu Role-Based Authorization Middleware
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4.2, docs/06_ROLES_AND_PERMISSIONS.md

const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Middleware factory to authorize user roles
 * @param {...string} allowedRoles - One or more canonical roles (CITIZEN, INFORMAL_COLLECTOR, RECYCLER, ADMIN)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Verify authenticated user context exists (must be preceded by authenticate middleware)
    if (!req.user || !req.user.role) {
      return next(new AppError('Authentication required before authorization check', 401, ERROR_CODES.UNAUTHORIZED));
    }

    // 2. Normalize arguments (handles both authorize('ADMIN') and authorize(['CITIZEN', 'ADMIN']))
    const roles = allowedRoles.flat();

    // 3. Verify user's role is in the permitted list
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'Access forbidden: Insufficient permissions for this resource',
          403,
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    // Role authorized, proceed
    next();
  };
};

module.exports = authorize;
