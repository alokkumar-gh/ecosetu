// EcoSetu Centralized Winston Logger
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 8

const { createLogger, format, transports } = require('winston');
const environment = require('./environment');

const { combine, timestamp, printf, colorize, json, errors } = format;

const devConsoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const errorStack = stack ? `\n${stack}` : '';
  return `[${timestamp}] ${level}: ${message}${metaString}${errorStack}`;
});

const logger = createLogger({
  level: environment.logLevel || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  defaultMeta: { service: 'ecosetu-backend' },
  transports: [
    new transports.Console({
      format:
        environment.nodeEnv === 'production'
          ? json()
          : combine(colorize(), devConsoleFormat),
    }),
  ],
});

module.exports = logger;
