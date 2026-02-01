/**
 * Logger utility using Pino
 * 
 * Provides structured logging with JSON output for production
 * and pretty printing for development.
 */

import pino from 'pino';
import { config } from '../config/index.js';

const isProduction = config.nodeEnv === 'production';

export const logger = pino({
  level: config.logLevel,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  base: {
    service: 'location-service',
    env: config.nodeEnv,
  },
});

// Child logger for specific components
export const createChildLogger = (component: string) =>
  logger.child({ component });
