/**
 * Database Schema for White-Labeled Mobility Platform
 * 
 * Multi-tenant architecture with tenant isolation via tenant_id column.
 * Row-Level Security (RLS) is enforced at the application layer and can be
 * enabled at the PostgreSQL level for additional security.
 * 
 * Tables:
 * - tenants: White-label client configurations
 * - users: Riders, drivers, and admins
 * - vehicles: Driver vehicles with taximeter info
 * - rides: Ride requests and trip history
 * - ride_waypoints: Pickup/dropoff coordinates
 * - payments: Transaction records
 * - driver_ratings: Rider ratings for drivers
 * - taximeter_readings: Finnish compliance - MID-compliant meter data
 */

import {
  pgTable,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  uuid,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const userTypeEnum = pgEnum('user_type', ['rider', 'driver', 'admin', 'dispatcher']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended', 'pending_verification']);
export const vehicleTypeEnum = pgEnum('vehicle_type', ['standard', 'comfort', 'xl', 'accessible', 'electric']);
export const rideStatusEnum = pgEnum('ride_status', [
  'requested',
  'searching',
  'driver_assigned',
  'driver_arriving',
  'arrived',
  'in_progress',
  'completed',
  'cancelled_by_rider',
  'cancelled_by_driver',
  'no_drivers_available',
]);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'mobilepay', 'bank_transfer', 'cash', 'invoice']);

// ============================================================================
// TENANTS (White-Label Clients)
// ============================================================================

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).notNull().unique(), // e.g., 'helsinki_taxi'
  name: varchar('name', { length: 100 }).notNull(),
  legalName: varchar('legal_name', { length: 200 }),
  businessId: varchar('business_id', { length: 20 }), // Finnish Y-tunnus
  vatNumber: varchar('vat_number', { length: 20 }), // Finnish ALV-numero
  
  // Branding
  primaryColor: varchar('primary_color', { length: 7 }).default('#003580'),
  secondaryColor: varchar('secondary_color', { length: 7 }).default('#D4AF37'),
  logoUrl: text('logo_url'),
  
  // Configuration
  defaultCurrency: varchar('default_currency', { length: 3 }).default('EUR'),
  timezone: varchar('timezone', { length: 50 }).default('Europe/Helsinki'),
  locale: varchar('locale', { length: 10 }).default('fi-FI'),
  
  // Pricing configuration (stored as JSON for flexibility)
  pricingConfig: jsonb('pricing_config').default({
    baseFare: 5.90,
    perKmRate: 1.60,
    perMinuteRate: 0.80,
    minimumFare: 8.00,
    bookingFee: 1.00,
    surgePricingEnabled: true,
    vatRate: 0.135, // 13.5% for passenger transport in Finland
  }),
  
  // Finnish compliance
  traficomLicenseNumber: varchar('traficom_license_number', { length: 50 }),
  enableTaximeterIntegration: boolean('enable_taximeter_integration').default(true),
  veroApiEnabled: boolean('vero_api_enabled').default(false),
  
  // Stripe Connect
  stripeAccountId: varchar('stripe_account_id', { length: 50 }),
  stripeOnboardingComplete: boolean('stripe_onboarding_complete').default(false),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('tenants_slug_idx').on(table.slug),
}));

// ============================================================================
// USERS (Riders, Drivers, Admins)
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Authentication
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  
  // Profile
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('fi'),
  
  // Type and status
  userType: userTypeEnum('user_type').notNull(),
  status: userStatusEnum('status').default('pending_verification'),
  
  // Driver-specific fields
  driverLicenseNumber: varchar('driver_license_number', { length: 50 }),
  driverLicenseExpiry: timestamp('driver_license_expiry'),
  taxiDriverPermitNumber: varchar('taxi_driver_permit_number', { length: 50 }), // Finnish taxi permit
  taxiDriverPermitExpiry: timestamp('taxi_driver_permit_expiry'),
  trainingCertificateNumber: varchar('training_certificate_number', { length: 50 }), // 21hr training
  
  // Ratings
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('5.00'),
  totalRatings: integer('total_ratings').default(0),
  totalRides: integer('total_rides').default(0),
  
  // Stripe Connect (for drivers)
  stripeCustomerId: varchar('stripe_customer_id', { length: 50 }),
  stripeConnectAccountId: varchar('stripe_connect_account_id', { length: 50 }),
  
  // Finnish compliance
  socialSecurityNumber: varchar('social_security_number', { length: 11 }), // Encrypted/hashed
  veroTaxNumber: varchar('vero_tax_number', { length: 20 }),
  
  // Push notifications
  fcmToken: text('fcm_token'),
  apnsToken: text('apns_token'),
  
  // Accessibility preferences
  accessibilityPreferences: jsonb('accessibility_preferences').default({
    highContrastMode: false,
    largeText: false,
    screenReaderOptimized: false,
  }),
  
  // Timestamps
  emailVerifiedAt: timestamp('email_verified_at'),
  phoneVerifiedAt: timestamp('phone_verified_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('users_tenant_idx').on(table.tenantId),
  emailTenantIdx: uniqueIndex('users_email_tenant_idx').on(table.email, table.tenantId),
  phoneTenantIdx: index('users_phone_tenant_idx').on(table.phone, table.tenantId),
  userTypeIdx: index('users_type_idx').on(table.userType),
}));

// ============================================================================
// VEHICLES
// ============================================================================

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  driverId: uuid('driver_id').notNull().references(() => users.id),
  
  // Vehicle info
  make: varchar('make', { length: 50 }).notNull(),
  model: varchar('model', { length: 50 }).notNull(),
  year: integer('year').notNull(),
  color: varchar('color', { length: 30 }).notNull(),
  vehicleType: vehicleTypeEnum('vehicle_type').default('standard'),
  
  // Registration
  registrationNumber: varchar('registration_number', { length: 10 }).notNull(), // Finnish format: ABC-123
  registrationExpiry: timestamp('registration_expiry'),
  
  // Finnish taxi requirements
  taxiLicensePlate: varchar('taxi_license_plate', { length: 10 }), // Yellow plate number
  traficomVehicleId: varchar('traficom_vehicle_id', { length: 50 }), // Linked to operator
  
  // Taximeter (MID-compliant)
  taximeterSerialNumber: varchar('taximeter_serial_number', { length: 50 }),
  taximeterModel: varchar('taximeter_model', { length: 50 }), // e.g., Mitax-400
  taximeterCalibrationDate: timestamp('taximeter_calibration_date'),
  taximeterBluetoothMac: varchar('taximeter_bluetooth_mac', { length: 17 }), // For app integration
  
  // Capacity
  passengerCapacity: integer('passenger_capacity').default(4),
  wheelchairAccessible: boolean('wheelchair_accessible').default(false),
  childSeatAvailable: boolean('child_seat_available').default(false),
  
  // Insurance
  insurancePolicyNumber: varchar('insurance_policy_number', { length: 50 }),
  insuranceExpiry: timestamp('insurance_expiry'),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('vehicles_tenant_idx').on(table.tenantId),
  driverIdx: index('vehicles_driver_idx').on(table.driverId),
  registrationIdx: uniqueIndex('vehicles_registration_idx').on(table.registrationNumber, table.tenantId),
}));

// ============================================================================
// RIDES
// ============================================================================

export const rides = pgTable('rides', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  riderId: uuid('rider_id').notNull().references(() => users.id),
  driverId: uuid('driver_id').references(() => users.id),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  
  // Status
  status: rideStatusEnum('status').default('requested'),
  
  // Pickup
  pickupLatitude: decimal('pickup_latitude', { precision: 10, scale: 7 }).notNull(),
  pickupLongitude: decimal('pickup_longitude', { precision: 10, scale: 7 }).notNull(),
  pickupAddress: text('pickup_address').notNull(),
  pickupPlaceId: varchar('pickup_place_id', { length: 100 }), // Google Place ID
  
  // Dropoff
  dropoffLatitude: decimal('dropoff_latitude', { precision: 10, scale: 7 }).notNull(),
  dropoffLongitude: decimal('dropoff_longitude', { precision: 10, scale: 7 }).notNull(),
  dropoffAddress: text('dropoff_address').notNull(),
  dropoffPlaceId: varchar('dropoff_place_id', { length: 100 }),
  
  // Route
  estimatedDistanceMeters: integer('estimated_distance_meters'),
  actualDistanceMeters: integer('actual_distance_meters'),
  estimatedDurationSeconds: integer('estimated_duration_seconds'),
  actualDurationSeconds: integer('actual_duration_seconds'),
  routePolyline: text('route_polyline'), // Encoded polyline
  
  // Pricing
  vehicleTypeRequested: vehicleTypeEnum('vehicle_type_requested').default('standard'),
  estimatedFare: decimal('estimated_fare', { precision: 10, scale: 2 }),
  baseFare: decimal('base_fare', { precision: 10, scale: 2 }),
  distanceFare: decimal('distance_fare', { precision: 10, scale: 2 }),
  timeFare: decimal('time_fare', { precision: 10, scale: 2 }),
  surgeMutiplier: decimal('surge_multiplier', { precision: 3, scale: 2 }).default('1.00'),
  finalFare: decimal('final_fare', { precision: 10, scale: 2 }),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('EUR'),
  
  // Finnish taximeter data
  taximeterFare: decimal('taximeter_fare', { precision: 10, scale: 2 }), // Official meter reading
  taximeterReceiptNumber: varchar('taximeter_receipt_number', { length: 50 }),
  
  // Payment
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentId: uuid('payment_id'),
  
  // Scheduling
  scheduledPickupTime: timestamp('scheduled_pickup_time'),
  isScheduled: boolean('is_scheduled').default(false),
  
  // Special requirements
  notes: text('notes'),
  requiresChildSeat: boolean('requires_child_seat').default(false),
  requiresWheelchairAccess: boolean('requires_wheelchair_access').default(false),
  numberOfPassengers: integer('number_of_passengers').default(1),
  
  // Cancellation
  cancellationReason: text('cancellation_reason'),
  cancelledBy: varchar('cancelled_by', { length: 20 }), // 'rider', 'driver', 'system'
  cancellationFee: decimal('cancellation_fee', { precision: 10, scale: 2 }),
  
  // SOS
  sosTriggered: boolean('sos_triggered').default(false),
  sosTriggeredAt: timestamp('sos_triggered_at'),
  
  // Timestamps
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  driverAssignedAt: timestamp('driver_assigned_at'),
  driverArrivedAt: timestamp('driver_arrived_at'),
  rideStartedAt: timestamp('ride_started_at'),
  rideCompletedAt: timestamp('ride_completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('rides_tenant_idx').on(table.tenantId),
  riderIdx: index('rides_rider_idx').on(table.riderId),
  driverIdx: index('rides_driver_idx').on(table.driverId),
  statusIdx: index('rides_status_idx').on(table.status),
  requestedAtIdx: index('rides_requested_at_idx').on(table.requestedAt),
}));

// ============================================================================
// PAYMENTS
// ============================================================================

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  rideId: uuid('ride_id').notNull().references(() => rides.id),
  riderId: uuid('rider_id').notNull().references(() => users.id),
  driverId: uuid('driver_id').references(() => users.id),
  
  // Amount
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('EUR'),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }),
  platformFee: decimal('platform_fee', { precision: 10, scale: 2 }),
  driverPayout: decimal('driver_payout', { precision: 10, scale: 2 }),
  
  // Payment method
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  
  // Status
  status: paymentStatusEnum('status').default('pending'),
  
  // Stripe
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 100 }),
  stripeTransferId: varchar('stripe_transfer_id', { length: 100 }), // For driver payout
  stripeRefundId: varchar('stripe_refund_id', { length: 100 }),
  
  // MobilePay specific
  mobilePayTransactionId: varchar('mobilepay_transaction_id', { length: 100 }),
  
  // Finnish compliance
  veroReportedAt: timestamp('vero_reported_at'),
  veroReportId: varchar('vero_report_id', { length: 100 }),
  receiptNumber: varchar('receipt_number', { length: 50 }),
  
  // Refund
  refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),
  refundReason: text('refund_reason'),
  refundedAt: timestamp('refunded_at'),
  
  // Timestamps
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('payments_tenant_idx').on(table.tenantId),
  rideIdx: index('payments_ride_idx').on(table.rideId),
  statusIdx: index('payments_status_idx').on(table.status),
  stripePaymentIntentIdx: index('payments_stripe_intent_idx').on(table.stripePaymentIntentId),
}));

// ============================================================================
// DRIVER RATINGS
// ============================================================================

export const driverRatings = pgTable('driver_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  rideId: uuid('ride_id').notNull().references(() => rides.id),
  riderId: uuid('rider_id').notNull().references(() => users.id),
  driverId: uuid('driver_id').notNull().references(() => users.id),
  
  // Rating
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  
  // Categories (optional detailed feedback)
  cleanlinessRating: integer('cleanliness_rating'),
  safetyRating: integer('safety_rating'),
  navigationRating: integer('navigation_rating'),
  
  // Response
  driverResponse: text('driver_response'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('ratings_tenant_idx').on(table.tenantId),
  driverIdx: index('ratings_driver_idx').on(table.driverId),
  rideIdx: uniqueIndex('ratings_ride_idx').on(table.rideId), // One rating per ride
}));

// ============================================================================
// TAXIMETER READINGS (Finnish Compliance)
// ============================================================================

export const taximeterReadings = pgTable('taximeter_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  rideId: uuid('ride_id').notNull().references(() => rides.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  driverId: uuid('driver_id').notNull().references(() => users.id),
  
  // MID-compliant taximeter data
  taximeterSerialNumber: varchar('taximeter_serial_number', { length: 50 }).notNull(),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull(),
  
  // Trip data from taximeter
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  distanceMeters: integer('distance_meters').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  
  // Fare breakdown
  baseFare: decimal('base_fare', { precision: 10, scale: 2 }).notNull(),
  distanceFare: decimal('distance_fare', { precision: 10, scale: 2 }).notNull(),
  timeFare: decimal('time_fare', { precision: 10, scale: 2 }).notNull(),
  extras: decimal('extras', { precision: 10, scale: 2 }).default('0.00'),
  totalFare: decimal('total_fare', { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull(),
  
  // Tariff info
  tariffCode: varchar('tariff_code', { length: 10 }),
  tariffDescription: varchar('tariff_description', { length: 100 }),
  
  // Digital signature (for authenticity verification)
  digitalSignature: text('digital_signature'),
  signatureValid: boolean('signature_valid'),
  
  // Traficom reporting
  traficomReportedAt: timestamp('traficom_reported_at'),
  traficomReportId: varchar('traficom_report_id', { length: 100 }),
  
  // Timestamps
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('taximeter_tenant_idx').on(table.tenantId),
  rideIdx: index('taximeter_ride_idx').on(table.rideId),
  receiptIdx: uniqueIndex('taximeter_receipt_idx').on(table.receiptNumber, table.tenantId),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  vehicles: many(vehicles),
  rides: many(rides),
  payments: many(payments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  vehicles: many(vehicles),
  ridesAsRider: many(rides, { relationName: 'riderRides' }),
  ridesAsDriver: many(rides, { relationName: 'driverRides' }),
  ratingsGiven: many(driverRatings, { relationName: 'riderRatings' }),
  ratingsReceived: many(driverRatings, { relationName: 'driverRatings' }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [vehicles.tenantId],
    references: [tenants.id],
  }),
  driver: one(users, {
    fields: [vehicles.driverId],
    references: [users.id],
  }),
  rides: many(rides),
  taximeterReadings: many(taximeterReadings),
}));

export const ridesRelations = relations(rides, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [rides.tenantId],
    references: [tenants.id],
  }),
  rider: one(users, {
    fields: [rides.riderId],
    references: [users.id],
    relationName: 'riderRides',
  }),
  driver: one(users, {
    fields: [rides.driverId],
    references: [users.id],
    relationName: 'driverRides',
  }),
  vehicle: one(vehicles, {
    fields: [rides.vehicleId],
    references: [vehicles.id],
  }),
  payments: many(payments),
  rating: one(driverRatings),
  taximeterReading: one(taximeterReadings),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  ride: one(rides, {
    fields: [payments.rideId],
    references: [rides.id],
  }),
  rider: one(users, {
    fields: [payments.riderId],
    references: [users.id],
  }),
  driver: one(users, {
    fields: [payments.driverId],
    references: [users.id],
  }),
}));

export const driverRatingsRelations = relations(driverRatings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [driverRatings.tenantId],
    references: [tenants.id],
  }),
  ride: one(rides, {
    fields: [driverRatings.rideId],
    references: [rides.id],
  }),
  rider: one(users, {
    fields: [driverRatings.riderId],
    references: [users.id],
    relationName: 'riderRatings',
  }),
  driver: one(users, {
    fields: [driverRatings.driverId],
    references: [users.id],
    relationName: 'driverRatings',
  }),
}));

export const taximeterReadingsRelations = relations(taximeterReadings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [taximeterReadings.tenantId],
    references: [tenants.id],
  }),
  ride: one(rides, {
    fields: [taximeterReadings.rideId],
    references: [rides.id],
  }),
  vehicle: one(vehicles, {
    fields: [taximeterReadings.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(users, {
    fields: [taximeterReadings.driverId],
    references: [users.id],
  }),
}));
