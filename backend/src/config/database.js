// EcoSetu Prisma Database Client
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 6

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['info', 'warn', 'error'],
    });
  }
  prisma = global.prisma;
}

/**
 * Gracefully disconnect Prisma client
 */
const disconnectDatabase = async () => {
  if (prisma) {
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed cleanly.');
    } catch (err) {
      logger.error('Error disconnecting database:', err);
    }
  }
};

module.exports = prisma;
module.exports.disconnectDatabase = disconnectDatabase;
