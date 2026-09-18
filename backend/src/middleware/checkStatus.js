// EcoSetu Account Status Check Middleware
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4, docs/06_ROLES_AND_PERMISSIONS.md

const AppError = require('../utils/AppError');
const { USER_STATUS, ERROR_CODES } = require('../utils/constants');

/**
 * Middleware factory to check user account status
 * @param {...string} allowedStatuses - Allowed status list (defaults to [USER_STATUS.ACTIVE])
 */
const checkStatus = (...allowedStatuses) => {
  const statuses = allowedStatuses.length > 0 ? allowedStatuses.flat() : [USER_STATUS.ACTIVE];

  return (req, res, next) => {
    if (!req.user || !req.user.status) {
      return next(new AppError('Authentication required before status check', 401, ERROR_CODES.UNAUTHORIZED));
    }

    if (req.user.status === USER_STATUS.SUSPENDED) {
      return next(new AppError('Your account has been suspended. Contact support.', 403, ERROR_CODES.FORBIDDEN));
    }

    if (req.user.status === USER_STATUS.DEACTIVATED) {
      return next(new AppError('Your account has been deactivated.', 403, ERROR_CODES.FORBIDDEN));
    }

    if (!statuses.includes(req.user.status)) {
      return next(
        new AppError(
          `Account status (${req.user.status}) does not permit this operation`,
          403,
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    next();
  };
};

module.exports = checkStatus;
