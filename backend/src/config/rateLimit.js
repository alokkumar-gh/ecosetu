// EcoSetu Rate Limiter Configuration
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/05_API_SPECIFICATION.md

const rateLimit = require('express-rate-limit');
const { ERROR_CODES } = require('../utils/constants');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10,000 requests per 15 minutes for mobile apps & polling
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many requests. Please try again later.',
      },
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 failed login attempts per 15 minutes per IP (EC-AUTH-04)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many authentication attempts. Please try again later.',
      },
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
