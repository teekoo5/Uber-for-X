/**
 * Logger utility using Pino
 */

import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.log.level,
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    service: 'core-api',
    env: config.nodeEnv,
  },
});
