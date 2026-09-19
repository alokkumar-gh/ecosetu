// EcoSetu Authentication Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 2

const authService = require('../services/authService');
const { sendSuccess } = require('../utils/responseHelper');
const environment = require('../config/environment');

const COOKIE_NAME = 'refreshToken';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

const setRefreshTokenCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: environment.isProduction,
    sameSite: environment.isProduction ? 'strict' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/api/v1/auth',
  });
};

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, name, phone, role } = req.body;
      const result = await authService.register({ email, password, name, phone, role });

      setRefreshTokenCookie(res, result.refreshToken);

      return sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken, // Also exposed for non-cookie mobile clients
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      setRefreshTokenCookie(res, result.refreshToken);

      return sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        200
      );
    } catch (err) {
      next(err);
    }
  }

  async firebaseLogin(req, res, next) {
    try {
      const { idToken, provider } = req.body;
      const result = await authService.firebaseLogin({ idToken, provider });

      setRefreshTokenCookie(res, result.refreshToken);

      return sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        200
      );
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      // Support refresh token from cookie or request body (for mobile apps)
      const token = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;
      const result = await authService.refresh(token);

      setRefreshTokenCookie(res, result.refreshToken);

      return sendSuccess(
        res,
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        200
      );
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: environment.isProduction,
        sameSite: environment.isProduction ? 'strict' : 'lax',
        path: '/api/v1/auth',
      });

      return sendSuccess(res, { message: 'Logged out successfully' }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
