// EcoSetu Express Application Setup
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const getCorsOptions = require('./config/cors');
const { apiLimiter } = require('./config/rateLimit');
const requestLogger = require('./middleware/requestLogger');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');
const apiV1Router = require('./routes');

const app = express();

// Trust reverse proxy (Render / Cloudflare) so req.ip reflects actual client IP
app.set('trust proxy', 1);

// 1. CORS Configuration
app.use(cors(getCorsOptions()));

// 2. HTTP Security Headers (docs/13_SECURITY_PRIVACY.md Section 4.4)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 3. Request Body Parsers (10MB limit for base64 audio and document OCR payloads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 3. Request Logging Middleware (Winston)
app.use(requestLogger);

// 4. Rate Limiting Middleware
app.use('/api', apiLimiter);

// 5. Root Health Endpoint (Service verification)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ecosetu-backend',
    timestamp: new Date().toISOString(),
  });
});

// 6. API v1 Routes
app.use('/api/v1', apiV1Router);

// 7. Route Not Found (404) Handler
app.use(notFoundHandler);

// 8. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
