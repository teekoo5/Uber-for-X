/**
 * Payment Service
 * 
 * Handles payment processing using Stripe Connect for multi-party payments.
 * Supports:
 * - Card payments
 * - MobilePay (via Stripe)
 * - Finnish bank buttons
 * - Driver payouts
 * - Finnish tax reporting (Vero API)
 */

import Stripe from 'stripe';
import { eq, and } from 'drizzle-orm';
import { db, payments, rides, users, tenants } from '../db/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Initialize Stripe
const stripe = config.stripe.secretKey 
  ? new Stripe(config.stripe.secretKey, { apiVersion: '2023-10-16' })
  : null;

// Types
export interface CreatePaymentIntentInput {
  tenantId: string;
  rideId: string;
  riderId: string;
  amount: number;
  currency?: string;
  paymentMethod?: 'card' | 'mobilepay';
}

export interface PaymentResult {
  paymentId: string;
  clientSecret: string;
  status: string;
}

export interface VeroReportInput {
  tenantId: string;
  paymentId: string;
  driverId: string;
  amount: number;
  vatAmount: number;
  receiptNumber: string;
  tripDate: Date;
}

export class PaymentService {
  /**
   * Create a payment intent for a ride
   */
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentResult> {
    const { tenantId, rideId, riderId, amount, currency = 'EUR', paymentMethod = 'card' } = input;

    if (!stripe) {
      throw new PaymentError('Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    // Get tenant for Stripe Connect account
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant?.stripeAccountId) {
      throw new PaymentError('Tenant Stripe account not configured', 'NO_STRIPE_ACCOUNT');
    }

    // Get ride details
    const ride = await db.query.rides.findFirst({
      where: and(eq(rides.id, rideId), eq(rides.tenantId, tenantId)),
    });

    if (!ride) {
      throw new PaymentError('Ride not found', 'RIDE_NOT_FOUND');
    }

    // Get rider for Stripe customer
    const rider = await db.query.users.findFirst({
      where: eq(users.id, riderId),
    });

    // Calculate platform fee
    const platformFeeAmount = Math.round(amount * config.stripe.platformFeePercent / 100);
    const driverPayoutAmount = amount - platformFeeAmount;

    // Calculate VAT
    const vatRate = config.finland.vatRatePassenger;
    const vatAmount = Math.round(amount * vatRate / (1 + vatRate) * 100) / 100;

    try {
      // Create Stripe PaymentIntent with Connect
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: currency.toLowerCase(),
        payment_method_types: paymentMethod === 'mobilepay' 
          ? ['mobilepay']
          : ['card'],
        metadata: {
          tenantId,
          rideId,
          riderId,
          platformFee: platformFeeAmount.toString(),
          vatAmount: vatAmount.toString(),
        },
        // Transfer to connected account (tenant) minus platform fee
        transfer_data: {
          destination: tenant.stripeAccountId,
        },
        application_fee_amount: Math.round(platformFeeAmount * 100),
        description: `Ride ${rideId.substring(0, 8)}`,
        receipt_email: rider?.email,
      };

      // Add customer if exists
      if (rider?.stripeCustomerId) {
        paymentIntentParams.customer = rider.stripeCustomerId;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      // Create payment record
      const [payment] = await db.insert(payments).values({
        tenantId,
        rideId,
        riderId,
        driverId: ride.driverId,
        amount: amount.toString(),
        currency,
        vatAmount: vatAmount.toString(),
        platformFee: (platformFeeAmount / 100).toString(),
        driverPayout: (driverPayoutAmount / 100).toString(),
        paymentMethod,
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
      }).returning();

      // Update ride with payment ID
      await db.update(rides)
        .set({ paymentId: payment.id })
        .where(eq(rides.id, rideId));

      logger.info({
        paymentId: payment.id,
        rideId,
        amount,
        stripePaymentIntentId: paymentIntent.id,
      }, 'Payment intent created');

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status,
      };
    } catch (err) {
      logger.error({ err, rideId }, 'Failed to create payment intent');
      throw new PaymentError('Failed to create payment', 'PAYMENT_CREATION_FAILED');
    }
  }

  /**
   * Confirm payment and process payout to driver
   */
  async confirmPayment(paymentIntentId: string): Promise<typeof payments.$inferSelect> {
    if (!stripe) {
      throw new PaymentError('Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    // Find payment by Stripe ID
    const payment = await db.query.payments.findFirst({
      where: eq(payments.stripePaymentIntentId, paymentIntentId),
    });

    if (!payment) {
      throw new PaymentError('Payment not found', 'PAYMENT_NOT_FOUND');
    }

    try {
      // Get PaymentIntent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update payment status
        const [updatedPayment] = await db.update(payments)
          .set({
            status: 'completed',
            stripeChargeId: typeof paymentIntent.latest_charge === 'string' 
              ? paymentIntent.latest_charge 
              : paymentIntent.latest_charge?.id,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id))
          .returning();

        // Generate receipt number
        const receiptNumber = this.generateReceiptNumber(payment.tenantId);
        await db.update(payments)
          .set({ receiptNumber })
          .where(eq(payments.id, payment.id));

        logger.info({ paymentId: payment.id }, 'Payment confirmed');

        // TODO: Trigger Vero API reporting for Finnish compliance
        // await this.reportToVero({ ... });

        // TODO: Process driver payout via Stripe Connect Transfer
        // await this.processDriverPayout(payment);

        return updatedPayment;
      } else {
        throw new PaymentError(`Payment not succeeded: ${paymentIntent.status}`, 'PAYMENT_NOT_SUCCEEDED');
      }
    } catch (err) {
      if (err instanceof PaymentError) throw err;
      logger.error({ err, paymentIntentId }, 'Failed to confirm payment');
      throw new PaymentError('Failed to confirm payment', 'PAYMENT_CONFIRMATION_FAILED');
    }
  }

  /**
   * Process refund
   */
  async refundPayment(
    paymentId: string,
    tenantId: string,
    amount?: number,
    reason?: string
  ): Promise<typeof payments.$inferSelect> {
    if (!stripe) {
      throw new PaymentError('Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    const payment = await db.query.payments.findFirst({
      where: and(
        eq(payments.id, paymentId),
        eq(payments.tenantId, tenantId)
      ),
    });

    if (!payment || !payment.stripePaymentIntentId) {
      throw new PaymentError('Payment not found', 'PAYMENT_NOT_FOUND');
    }

    const refundAmount = amount || parseFloat(payment.amount);

    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100),
        reason: 'requested_by_customer',
      });

      const [updatedPayment] = await db.update(payments)
        .set({
          status: 'refunded',
          stripeRefundId: refund.id,
          refundAmount: refundAmount.toString(),
          refundReason: reason,
          refundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId))
        .returning();

      logger.info({ paymentId, refundId: refund.id, amount: refundAmount }, 'Payment refunded');

      return updatedPayment;
    } catch (err) {
      logger.error({ err, paymentId }, 'Failed to refund payment');
      throw new PaymentError('Failed to refund payment', 'REFUND_FAILED');
    }
  }

  /**
   * Create Stripe customer for a user
   */
  async createStripeCustomer(
    userId: string,
    tenantId: string
  ): Promise<string> {
    if (!stripe) {
      throw new PaymentError('Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenantId, tenantId)),
    });

    if (!user) {
      throw new PaymentError('User not found', 'USER_NOT_FOUND');
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      phone: user.phone,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId,
        tenantId,
      },
    });

    await db.update(users)
      .set({ stripeCustomerId: customer.id })
      .where(eq(users.id, userId));

    logger.info({ userId, stripeCustomerId: customer.id }, 'Stripe customer created');

    return customer.id;
  }

  /**
   * Create Stripe Connect account for a driver
   */
  async createDriverConnectAccount(
    driverId: string,
    tenantId: string
  ): Promise<{ accountId: string; onboardingUrl: string }> {
    if (!stripe) {
      throw new PaymentError('Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    const driver = await db.query.users.findFirst({
      where: and(
        eq(users.id, driverId),
        eq(users.tenantId, tenantId),
        eq(users.userType, 'driver')
      ),
    });

    if (!driver) {
      throw new PaymentError('Driver not found', 'DRIVER_NOT_FOUND');
    }

    if (driver.stripeConnectAccountId) {
      // Return existing account link
      const accountLink = await stripe.accountLinks.create({
        account: driver.stripeConnectAccountId,
        refresh_url: `${config.locationService.url}/stripe/refresh`,
        return_url: `${config.locationService.url}/stripe/return`,
        type: 'account_onboarding',
      });

      return {
        accountId: driver.stripeConnectAccountId,
        onboardingUrl: accountLink.url,
      };
    }

    // Create Connect Express account for driver
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FI', // Finland
      email: driver.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: '4121', // Taxicabs and Limousines
        product_description: 'Taxi driver services',
      },
      metadata: {
        driverId,
        tenantId,
      },
    });

    // Update driver with Connect account ID
    await db.update(users)
      .set({ stripeConnectAccountId: account.id })
      .where(eq(users.id, driverId));

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${config.locationService.url}/stripe/refresh`,
      return_url: `${config.locationService.url}/stripe/return`,
      type: 'account_onboarding',
    });

    logger.info({ driverId, accountId: account.id }, 'Stripe Connect account created');

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  }

  /**
   * Process payout to driver
   */
  async processDriverPayout(payment: typeof payments.$inferSelect): Promise<void> {
    if (!stripe || !payment.driverId) {
      return;
    }

    const driver = await db.query.users.findFirst({
      where: eq(users.id, payment.driverId),
    });

    if (!driver?.stripeConnectAccountId) {
      logger.warn({ driverId: payment.driverId }, 'Driver has no Connect account');
      return;
    }

    const payoutAmount = parseFloat(payment.driverPayout || '0');
    if (payoutAmount <= 0) {
      return;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(payoutAmount * 100),
        currency: payment.currency.toLowerCase(),
        destination: driver.stripeConnectAccountId,
        metadata: {
          paymentId: payment.id,
          rideId: payment.rideId,
        },
      });

      await db.update(payments)
        .set({ stripeTransferId: transfer.id })
        .where(eq(payments.id, payment.id));

      logger.info({
        paymentId: payment.id,
        driverId: payment.driverId,
        amount: payoutAmount,
        transferId: transfer.id,
      }, 'Driver payout processed');
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Failed to process driver payout');
    }
  }

  /**
   * Report income to Vero (Finnish Tax Administration)
   * This is a placeholder - actual implementation would integrate with Vero API
   */
  async reportToVero(input: VeroReportInput): Promise<void> {
    if (!config.finland.veroApiEndpoint || !config.finland.veroApiKey) {
      logger.debug('Vero API not configured, skipping reporting');
      return;
    }

    // TODO: Implement actual Vero API integration
    // This would involve:
    // 1. Formatting the income report according to Vero specifications
    // 2. Authenticating with Vero API
    // 3. Submitting the real-time income report
    // 4. Storing the confirmation

    logger.info({
      paymentId: input.paymentId,
      driverId: input.driverId,
      amount: input.amount,
    }, 'Would report to Vero API');

    // Update payment with Vero report timestamp
    await db.update(payments)
      .set({
        veroReportedAt: new Date(),
        veroReportId: `VERO-${Date.now()}`, // Placeholder
      })
      .where(eq(payments.id, input.paymentId));
  }

  /**
   * Generate unique receipt number (Finnish format)
   */
  private generateReceiptNumber(tenantId: string): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const tenantPrefix = tenantId.slice(0, 3).toUpperCase();
    
    return `${tenantPrefix}-${dateStr}-${random}`;
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string, tenantId: string): Promise<typeof payments.$inferSelect | null> {
    return db.query.payments.findFirst({
      where: and(
        eq(payments.id, paymentId),
        eq(payments.tenantId, tenantId)
      ),
    });
  }

  /**
   * Get payments for a ride
   */
  async getPaymentsForRide(rideId: string, tenantId: string): Promise<(typeof payments.$inferSelect)[]> {
    return db.query.payments.findMany({
      where: and(
        eq(payments.rideId, rideId),
        eq(payments.tenantId, tenantId)
      ),
    });
  }
}

/**
 * Custom error class for payment errors
 */
export class PaymentError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
