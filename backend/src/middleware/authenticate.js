// EcoSetu Authentication Middleware
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4.1, docs/05_API_SPECIFICATION.md

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');
const { USER_STATUS } = require('../utils/constants');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized('Authentication token is required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, environment.jwtAccessSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Authentication token has expired');
      }
      throw AppError.unauthorized('Invalid authentication token');
    }

    if (!decoded || !decoded.userId) {
      throw AppError.unauthorized('Malformed token payload');
    }

    // Retrieve user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('User associated with this token no longer exists');
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      throw AppError.forbidden('Your account has been suspended');
    }

    if (user.status === USER_STATUS.DEACTIVATED) {
      throw AppError.forbidden('Your account has been deactivated');
    }

    // Attach authenticated user context to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticate;
