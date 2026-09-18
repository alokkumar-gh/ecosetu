// EcoSetu Collector/Recycler Verification Check Middleware
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4.3, docs/06_ROLES_AND_PERMISSIONS.md Section 3.3

const AppError = require('../utils/AppError');
const { ROLES, USER_STATUS, ERROR_CODES } = require('../utils/constants');

/**
 * Middleware enforcing verification for operational actions.
 * If user role is INFORMAL_COLLECTOR or RECYCLER, status must be ACTIVE.
 * Citizens and Admins pass through without collector/recycler verification requirement.
 */
const checkVerified = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return next(new AppError('Authentication required before verification check', 401, ERROR_CODES.UNAUTHORIZED));
  }

  const { role, status } = req.user;

  if (role === ROLES.INFORMAL_COLLECTOR || role === ROLES.RECYCLER) {
    if (status !== USER_STATUS.ACTIVE) {
      return next(
        new AppError(
          'Account not yet verified. Administrator approval is required.',
          403,
          ERROR_CODES.FORBIDDEN,
          { verificationStatus: status }
        )
      );
    }
  }

  next();
};

module.exports = checkVerified;
