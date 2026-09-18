// EcoSetu Authentication Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.1, docs/05_API_SPECIFICATION.md

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');
const { ROLES, USER_STATUS, ERROR_CODES } = require('../utils/constants');

const BCRYPT_SALT_ROUNDS = 10;

class AuthService {
  /**
   * Hash a plain-text password using bcrypt
   * @param {string} plaintext
   * @returns {Promise<string>}
   */
  async hashPassword(plaintext) {
    return bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Compare plain-text password against bcrypt hash
   * @param {string} plaintext
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async comparePassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Generate short-lived JWT access token (15m default)
   * @param {object} user - User object
   * @returns {string}
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    return jwt.sign(payload, environment.jwtAccessSecret, {
      expiresIn: environment.jwtAccessExpiry,
    });
  }

  /**
   * Generate long-lived JWT refresh token (7d default)
   * @param {object} user - User object
   * @returns {string}
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };

    return jwt.sign(payload, environment.jwtRefreshSecret, {
      expiresIn: environment.jwtRefreshExpiry,
    });
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token
   * @param {string} secret
   * @returns {object}
   */
  verifyToken(token, secret) {
    return jwt.verify(token, secret);
  }

  /**
   * Register a new user
   * @param {object} userData
   */
  async register({ email, password, name, phone, role }) {
    // 1. Guard against self-assigning ADMIN role
    if (role === ROLES.ADMIN) {
      throw AppError.forbidden('Admin accounts cannot be created via self-registration');
    }

    const allowedRoles = [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER];
    if (!allowedRoles.includes(role)) {
      throw AppError.validation('Invalid role. Allowed roles: CITIZEN, INFORMAL_COLLECTOR, RECYCLER');
    }

    // 2. Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    // 3. Hash password
    const passwordHash = await this.hashPassword(password);

    // 4. Determine initial status: CITIZEN is ACTIVE immediately; others PENDING_VERIFICATION
    const status = role === ROLES.CITIZEN ? USER_STATUS.ACTIVE : USER_STATUS.PENDING_VERIFICATION;

    // 5. Create user in database
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        role,
        status,
      },
    });

    // 6. Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticate an existing user
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    // 1. Lookup user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, ERROR_CODES.UNAUTHORIZED);
    }

    // 2. Verify password
    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, ERROR_CODES.UNAUTHORIZED);
    }

    // 3. Check account suspension (EC-AUTH-03)
    if (user.status === USER_STATUS.SUSPENDED) {
      throw new AppError('Your account has been suspended. Contact support.', 403, ERROR_CODES.FORBIDDEN);
    }

    if (user.status === USER_STATUS.DEACTIVATED) {
      throw new AppError('Your account has been deactivated.', 403, ERROR_CODES.FORBIDDEN);
    }

    // 4. Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh expired access token using valid refresh token
   * @param {string} refreshToken
   */
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    let decoded;
    try {
      decoded = this.verifyToken(refreshToken, environment.jwtRefreshSecret);
    } catch (err) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh' || !decoded.userId) {
      throw AppError.unauthorized('Invalid token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw AppError.unauthorized('User associated with this token no longer exists');
    }

    if (user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.DEACTIVATED) {
      throw AppError.forbidden('User account is inactive');
    }

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}

module.exports = new AuthService();
