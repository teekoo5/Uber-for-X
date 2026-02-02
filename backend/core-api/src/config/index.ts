/**
 * Configuration for Core API
 * 
 * Loads configuration from environment variables with sensible defaults.
 */

import 'dotenv/config';

function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  database: {
    url: requireEnv('DATABASE_URL', 'postgresql://mobility:mobility_dev@localhost:5432/mobility_db'),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  // Kafka
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'core-api',
    groupId: process.env.KAFKA_GROUP_ID || 'core-api-group',
  },

  // JWT Authentication
  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Multi-tenant
  tenant: {
    defaultTenantId: process.env.DEFAULT_TENANT_ID || 'helsinki_taxi',
    enableIsolation: process.env.ENABLE_TENANT_ISOLATION !== 'false',
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    platformFeePercent: 15, // 15% platform fee
  },

  // Finnish compliance
  finland: {
    veroApiEndpoint: process.env.VERO_API_ENDPOINT || '',
    veroApiKey: process.env.VERO_API_KEY || '',
    vatRatePassenger: parseFloat(process.env.VAT_RATE_PASSENGER_TRANSPORT || '0.135'),
    vatRateGoods: parseFloat(process.env.VAT_RATE_GOODS_TRANSPORT || '0.255'),
  },

  // Google Maps
  maps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  // Location Service
  locationService: {
    url: process.env.LOCATION_SERVICE_URL || 'http://localhost:3001',
    wsUrl: process.env.LOCATION_SERVICE_WS_URL || 'ws://localhost:3001/ws',
  },

  // Logging
  log: {
    level: process.env.LOG_LEVEL || 'debug',
  },

  // Pricing defaults
  pricing: {
    defaultBaseFare: 5.90,
    defaultPerKmRate: 1.60,
    defaultPerMinuteRate: 0.80,
    defaultMinimumFare: 8.00,
    defaultBookingFee: 1.00,
    maxSurgeMultiplier: 3.0,
  },
} as const;
