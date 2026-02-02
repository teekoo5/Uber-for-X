/**
 * Vero Service
 * 
 * Integration with Finnish Tax Administration (Vero) API
 * for real-time income reporting and VAT compliance.
 * 
 * Finnish Taxi Requirements (2026):
 * - Real-time income reporting for each completed fare
 * - VAT calculation and reporting (13.5% for passenger transport)
 * - Digital receipt generation
 * - Driver income tracking for tax purposes
 * 
 * Note: This is a placeholder implementation.
 * The actual Vero API integration requires:
 * - Suomi.fi e-identification for API access
 * - Business certificate (Varmenne) for authentication
 * - Compliance with Vero's technical specifications
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// VAT rates for Finland (2026)
export const VAT_RATES = {
  PASSENGER_TRANSPORT: 0.135, // 13.5% for taxi/passenger transport
  GOODS_TRANSPORT: 0.255,     // 25.5% for goods delivery
  STANDARD: 0.255,            // Standard rate
  REDUCED: 0.14,              // Reduced rate (food, etc.)
} as const;

// Income report types
export enum IncomeType {
  TAXI_FARE = 'TAXI_FARE',
  BOOKING_FEE = 'BOOKING_FEE',
  CANCELLATION_FEE = 'CANCELLATION_FEE',
  TIP = 'TIP',
}

// Income report interface
export interface IncomeReport {
  transactionId: string;
  tenantId: string;
  driverId: string;
  driverBusinessId: string; // Y-tunnus
  driverTaxNumber: string;  // Vero tax number
  
  // Transaction details
  timestamp: Date;
  incomeType: IncomeType;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  vatRate: number;
  currency: string;
  
  // Trip details
  rideId?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  distanceKm?: number;
  durationMinutes?: number;
  
  // Taximeter data (for compliance)
  taximeterReceiptNumber?: string;
  taximeterSerialNumber?: string;
  
  // Payment info
  paymentMethod: string;
  paymentReference?: string;
}

// Vero API response
export interface VeroReportResponse {
  reportId: string;
  status: 'accepted' | 'pending' | 'rejected';
  message?: string;
  timestamp: string;
}

// Receipt data
export interface TaxReceipt {
  receiptNumber: string;
  timestamp: Date;
  tenantName: string;
  tenantBusinessId: string;
  driverName: string;
  driverId: string;
  
  // Trip info
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  durationMinutes: number;
  
  // Fare breakdown
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  extras: number;
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  currency: string;
  
  // Payment
  paymentMethod: string;
  
  // Verification
  taximeterReceiptNumber?: string;
  verificationCode?: string;
}

export class VeroService {
  private client: AxiosInstance | null = null;
  private isConfigured = false;

  constructor() {
    if (config.finland.veroApiEndpoint && config.finland.veroApiKey) {
      this.client = axios.create({
        baseURL: config.finland.veroApiEndpoint,
        headers: {
          'X-API-Key': config.finland.veroApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      this.isConfigured = true;
      logger.info('Vero API service configured');
    } else {
      logger.warn('Vero API not configured - income reporting disabled');
    }
  }

  /**
   * Calculate VAT for an amount
   */
  calculateVAT(
    grossAmount: number,
    vatRate: number = VAT_RATES.PASSENGER_TRANSPORT
  ): { netAmount: number; vatAmount: number } {
    // Finnish taxi prices are VAT-inclusive
    // VAT amount = Gross / (1 + rate) * rate
    const netAmount = grossAmount / (1 + vatRate);
    const vatAmount = grossAmount - netAmount;

    return {
      netAmount: Math.round(netAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
    };
  }

  /**
   * Report income to Vero
   */
  async reportIncome(report: IncomeReport): Promise<VeroReportResponse> {
    if (!this.isConfigured || !this.client) {
      logger.debug('Vero API not configured, skipping income report');
      return {
        reportId: `LOCAL-${Date.now()}`,
        status: 'pending',
        message: 'Vero API not configured - report stored locally',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Format the report according to Vero API specifications
      const veroPayload = this.formatVeroPayload(report);

      // In production, this would make an actual API call
      // const response = await this.client.post('/income-reports', veroPayload);

      // For now, simulate a successful response
      const response: VeroReportResponse = {
        reportId: `VERO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'accepted',
        timestamp: new Date().toISOString(),
      };

      logger.info({
        reportId: response.reportId,
        transactionId: report.transactionId,
        amount: report.grossAmount,
      }, 'Income reported to Vero');

      return response;
    } catch (err) {
      logger.error({ err, report }, 'Failed to report income to Vero');
      
      // Store failed reports for retry
      await this.storeFailedReport(report);

      return {
        reportId: `FAILED-${Date.now()}`,
        status: 'rejected',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Format payload for Vero API
   */
  private formatVeroPayload(report: IncomeReport): Record<string, unknown> {
    return {
      // Business identification
      payerBusinessId: report.tenantId, // Platform Y-tunnus
      payeeBusinessId: report.driverBusinessId, // Driver Y-tunnus
      payeeTaxNumber: report.driverTaxNumber,
      
      // Income details
      incomeType: 'TAXI_TRANSPORT',
      transactionDate: report.timestamp.toISOString().split('T')[0],
      transactionTime: report.timestamp.toISOString().split('T')[1].split('.')[0],
      transactionId: report.transactionId,
      
      // Amounts
      grossAmount: Math.round(report.grossAmount * 100), // In cents
      vatAmount: Math.round(report.vatAmount * 100),
      vatRate: report.vatRate * 100, // As percentage
      currency: report.currency,
      
      // Trip details
      tripDetails: {
        pickupAddress: report.pickupAddress,
        dropoffAddress: report.dropoffAddress,
        distanceKm: report.distanceKm,
        durationMinutes: report.durationMinutes,
      },
      
      // Taximeter verification
      taximeterData: report.taximeterReceiptNumber ? {
        receiptNumber: report.taximeterReceiptNumber,
        serialNumber: report.taximeterSerialNumber,
      } : null,
      
      // Payment
      paymentMethod: report.paymentMethod,
      paymentReference: report.paymentReference,
    };
  }

  /**
   * Store failed report for later retry
   */
  private async storeFailedReport(report: IncomeReport): Promise<void> {
    // In production, store in database or message queue for retry
    logger.warn({ transactionId: report.transactionId }, 'Storing failed Vero report for retry');
  }

  /**
   * Generate a tax-compliant digital receipt
   */
  generateReceipt(data: {
    rideId: string;
    tenantName: string;
    tenantBusinessId: string;
    driverName: string;
    driverId: string;
    pickup: { address: string };
    dropoff: { address: string };
    distanceKm: number;
    durationMinutes: number;
    fareBreakdown: {
      baseFare: number;
      distanceFare: number;
      timeFare: number;
      extras?: number;
    };
    total: number;
    paymentMethod: string;
    taximeterReceiptNumber?: string;
  }): TaxReceipt {
    const vatCalc = this.calculateVAT(data.total, VAT_RATES.PASSENGER_TRANSPORT);
    const extras = data.fareBreakdown.extras || 0;
    const subtotal = data.fareBreakdown.baseFare + data.fareBreakdown.distanceFare + 
                     data.fareBreakdown.timeFare + extras;

    const receiptNumber = this.generateReceiptNumber();
    const verificationCode = this.generateVerificationCode(receiptNumber, data.total);

    return {
      receiptNumber,
      timestamp: new Date(),
      tenantName: data.tenantName,
      tenantBusinessId: data.tenantBusinessId,
      driverName: data.driverName,
      driverId: data.driverId,
      
      pickupAddress: data.pickup.address,
      dropoffAddress: data.dropoff.address,
      distanceKm: data.distanceKm,
      durationMinutes: data.durationMinutes,
      
      baseFare: data.fareBreakdown.baseFare,
      distanceFare: data.fareBreakdown.distanceFare,
      timeFare: data.fareBreakdown.timeFare,
      extras,
      subtotal,
      vatAmount: vatCalc.vatAmount,
      vatRate: VAT_RATES.PASSENGER_TRANSPORT,
      total: data.total,
      currency: 'EUR',
      
      paymentMethod: data.paymentMethod,
      taximeterReceiptNumber: data.taximeterReceiptNumber,
      verificationCode,
    };
  }

  /**
   * Generate unique receipt number
   */
  private generateReceiptNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `RCP-${dateStr}-${sequence}`;
  }

  /**
   * Generate verification code for receipt authenticity
   */
  private generateVerificationCode(receiptNumber: string, amount: number): string {
    // In production, use cryptographic signing
    const data = `${receiptNumber}:${amount}:${Date.now()}`;
    const hash = Buffer.from(data).toString('base64').substring(0, 12);
    return hash.toUpperCase();
  }

  /**
   * Format receipt as text (for printing/display)
   */
  formatReceiptText(receipt: TaxReceipt): string {
    const line = '='.repeat(40);
    const lines = [
      line,
      `${receipt.tenantName}`.padStart(20 + receipt.tenantName.length / 2),
      `Y-tunnus: ${receipt.tenantBusinessId}`,
      line,
      '',
      `Kuitti / Receipt: ${receipt.receiptNumber}`,
      `Päivämäärä: ${receipt.timestamp.toLocaleDateString('fi-FI')}`,
      `Aika: ${receipt.timestamp.toLocaleTimeString('fi-FI')}`,
      '',
      `Kuljettaja: ${receipt.driverName}`,
      '',
      'MATKAN TIEDOT / TRIP DETAILS',
      '-'.repeat(40),
      `Nouto: ${receipt.pickupAddress}`,
      `Kohde: ${receipt.dropoffAddress}`,
      `Matka: ${receipt.distanceKm.toFixed(1)} km`,
      `Kesto: ${receipt.durationMinutes} min`,
      '',
      'HINNAN ERITTELY / FARE BREAKDOWN',
      '-'.repeat(40),
      `Perusmaksu:          ${receipt.baseFare.toFixed(2)} €`,
      `Matkamaksu:          ${receipt.distanceFare.toFixed(2)} €`,
      `Aikamaksu:           ${receipt.timeFare.toFixed(2)} €`,
    ];

    if (receipt.extras > 0) {
      lines.push(`Lisämaksut:          ${receipt.extras.toFixed(2)} €`);
    }

    lines.push(
      '-'.repeat(40),
      `Välisumma:           ${receipt.subtotal.toFixed(2)} €`,
      `ALV ${(receipt.vatRate * 100).toFixed(1)}%:           ${receipt.vatAmount.toFixed(2)} €`,
      '='.repeat(40),
      `YHTEENSÄ / TOTAL:    ${receipt.total.toFixed(2)} ${receipt.currency}`,
      '='.repeat(40),
      '',
      `Maksutapa: ${receipt.paymentMethod}`,
    );

    if (receipt.taximeterReceiptNumber) {
      lines.push(`Taksamittari: ${receipt.taximeterReceiptNumber}`);
    }

    lines.push(
      '',
      `Vahvistuskoodi: ${receipt.verificationCode}`,
      '',
      'Kiitos matkasta! / Thank you for riding!',
      line,
    );

    return lines.join('\n');
  }

  /**
   * Get VAT summary for a period (for reporting)
   */
  async getVATSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalGross: number;
    totalNet: number;
    totalVAT: number;
    transactionCount: number;
    byVATRate: Record<string, { gross: number; net: number; vat: number; count: number }>;
  }> {
    // In production, query from database
    // This is a placeholder return
    return {
      totalGross: 0,
      totalNet: 0,
      totalVAT: 0,
      transactionCount: 0,
      byVATRate: {},
    };
  }
}

// Export singleton instance
export const veroService = new VeroService();
