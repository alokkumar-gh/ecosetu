// EcoSetu Environment Configuration Loader
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 7

require('dotenv').config();

const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_in_production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  logLevel: process.env.LOG_LEVEL || 'info',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

// Basic validation for production environments (docs/13_SECURITY_PRIVACY.md Section 8.2)
if (environment.isProduction) {
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.includes('dev_')) missing.push('JWT_ACCESS_SECRET');
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.includes('dev_')) missing.push('JWT_REFRESH_SECRET');

  if (missing.length > 0) {
    throw new Error(`[FATAL] Missing or default critical production environment variables: ${missing.join(', ')}`);
  }
}

module.exports = environment;
