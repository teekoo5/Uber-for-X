/**
 * Configuration module for Location Service
 * 
 * Loads environment variables and provides typed configuration
 * for all service components including Redis, WebSocket, and multi-tenant settings.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration schema with validation
const configSchema = z.object({
  // Server
  port: z.coerce.number().default(3001),
  host: z.string().default('0.0.0.0'),
  nodeEnv: z.enum(['development', 'staging', 'production']).default('development'),

  // Redis
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
    db: z.coerce.number().default(0),
    keyPrefix: z.string().default('mobility:'),
  }),

  // WebSocket
  ws: z.object({
    path: z.string().default('/location'),
    pingInterval: z.coerce.number().default(30000),
    pingTimeout: z.coerce.number().default(5000),
  }),

  // Location
  location: z.object({
    updateIntervalMs: z.coerce.number().default(5000),
    driverTtlSeconds: z.coerce.number().default(60),
    defaultSearchRadius: z.coerce.number().default(5000),
    maxSearchRadius: z.coerce.number().default(50000),
  }),

  // Multi-tenant
  tenant: z.object({
    enableIsolation: z.coerce.boolean().default(true),
    defaultTenantId: z.string().default('default'),
  }),

  // Rate Limiting
  rateLimit: z.object({
    windowMs: z.coerce.number().default(1000),
    maxRequests: z.coerce.number().default(100),
  }),

  // Logging
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Kafka (optional)
  kafka: z.object({
    enabled: z.coerce.boolean().default(false),
    brokers: z.string().default('localhost:9092'),
    locationTopic: z.string().default('location-updates'),
    clientId: z.string().default('location-service'),
  }),
});

// Parse and validate configuration
const rawConfig = {
  port: process.env.PORT,
  host: process.env.HOST,
  nodeEnv: process.env.NODE_ENV,
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
    keyPrefix: process.env.REDIS_KEY_PREFIX,
  },
  ws: {
    path: process.env.WS_PATH,
    pingInterval: process.env.WS_PING_INTERVAL,
    pingTimeout: process.env.WS_PING_TIMEOUT,
  },
  location: {
    updateIntervalMs: process.env.LOCATION_UPDATE_INTERVAL_MS,
    driverTtlSeconds: process.env.DRIVER_LOCATION_TTL_SECONDS,
    defaultSearchRadius: process.env.DEFAULT_SEARCH_RADIUS_METERS,
    maxSearchRadius: process.env.MAX_SEARCH_RADIUS_METERS,
  },
  tenant: {
    enableIsolation: process.env.ENABLE_TENANT_ISOLATION,
    defaultTenantId: process.env.DEFAULT_TENANT_ID,
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
  },
  logLevel: process.env.LOG_LEVEL,
  kafka: {
    enabled: process.env.KAFKA_ENABLED,
    brokers: process.env.KAFKA_BROKERS,
    locationTopic: process.env.KAFKA_LOCATION_TOPIC,
    clientId: process.env.KAFKA_CLIENT_ID,
  },
};

export const config = configSchema.parse(rawConfig);

export type Config = z.infer<typeof configSchema>;
