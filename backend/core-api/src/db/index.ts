/**
 * Database Connection
 * 
 * Drizzle ORM with PostgreSQL for multi-tenant mobility platform.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import * as schema from './schema.js';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool events
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Database pool error');
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in queries
export * from './schema.js';

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info({ time: result.rows[0].now }, 'Database connection successful');
    return true;
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    return false;
  }
}

/**
 * Close database pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}
