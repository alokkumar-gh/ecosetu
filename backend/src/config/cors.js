// EcoSetu CORS Configuration
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 4

const environment = require('./environment');

const getCorsOptions = (overrideOrigin = null, isProd = null) => {
  const isProduction = isProd !== null ? isProd : (process.env.NODE_ENV === 'production' || environment.isProduction);
  const allowedOrigin = overrideOrigin !== null ? overrideOrigin : (process.env.CORS_ORIGIN || environment.corsOrigin);

  // In non-production, allow open wildcard if configured
  if (allowedOrigin === '*' && !isProduction) {
    return {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  }

  // In production or when specific origins are configured (docs/13_SECURITY_PRIVACY.md Section 4.3)
  const origins = allowedOrigin === '*' ? [] : allowedOrigin.split(',').map((o) => o.trim());

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (origins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
};

module.exports = getCorsOptions;
