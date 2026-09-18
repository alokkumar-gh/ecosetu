// EcoSetu HTTP Server Entry Point
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 2

const app = require('./app');
const environment = require('./config/environment');
const logger = require('./config/logger');
const { disconnectDatabase } = require('./config/database');

const server = app.listen(environment.port, '0.0.0.0', () => {
  logger.info(`[EcoSetu Backend] Listening on 0.0.0.0:${environment.port} (env: ${environment.nodeEnv})`);
});

// Graceful shutdown handlers
const shutdown = async (signal) => {
  logger.info(`[EcoSetu Backend] ${signal} received, closing HTTP server...`);

  server.close(async () => {
    logger.info('[EcoSetu Backend] HTTP server closed.');
    await disconnectDatabase();
    process.exit(0);
  });

  // Force close after 10 seconds if not finished
  setTimeout(() => {
    logger.error('[EcoSetu Backend] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
