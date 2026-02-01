/**
 * WebSocket Service
 * 
 * Handles real-time bidirectional communication for:
 * - Driver location streaming
 * - Rider nearby driver queries
 * - Live driver tracking during rides
 * 
 * Supports multi-tenant isolation and connection state management.
 */

import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { redisGeoService } from './redis-geo.service.js';
import {
  LocationUpdateSchema,
  NearbyDriversRequestSchema,
  MessageType,
  type WebSocketMessage,
  type ClientInfo,
  type DriverLocation,
} from '../models/location.js';

interface ExtendedWebSocket extends WebSocket {
  clientInfo?: ClientInfo;
  isAlive?: boolean;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ExtendedWebSocket> = new Map();
  private driverSubscriptions: Map<string, Set<string>> = new Map(); // driverId -> Set<clientId>
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: any): void {
    this.wss = new WebSocketServer({
      server,
      path: config.ws.path,
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => {
      logger.error({ error }, 'WebSocket server error');
    });

    // Start ping/pong heartbeat
    this.startHeartbeat();

    logger.info({ path: config.ws.path }, 'WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: ExtendedWebSocket, req: IncomingMessage): void {
    // Parse query parameters for authentication
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    const userType = url.searchParams.get('userType') as 'driver' | 'rider' | 'admin';
    const tenantId = url.searchParams.get('tenantId') || config.tenant.defaultTenantId;

    if (!userId || !userType) {
      logger.warn('Connection rejected: missing userId or userType');
      ws.close(4001, 'Missing required parameters');
      return;
    }

    // Generate unique client ID
    const clientId = uuidv4();

    // Store client info
    ws.clientInfo = {
      userId,
      userType,
      tenantId,
      connectedAt: new Date(),
      subscriptions: new Set(),
    };
    ws.isAlive = true;

    this.clients.set(clientId, ws);

    logger.info(
      { clientId, userId, userType, tenantId },
      'Client connected'
    );

    // Send connection confirmation
    this.sendMessage(ws, {
      type: MessageType.CONNECTED,
      payload: {
        clientId,
        tenantId,
        serverTime: new Date().toISOString(),
      },
    });

    // Set up event handlers
    ws.on('message', (data) => this.handleMessage(ws, clientId, data));
    ws.on('pong', () => this.handlePong(ws));
    ws.on('close', () => this.handleClose(clientId, ws));
    ws.on('error', (error) => this.handleError(clientId, error));
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(
    ws: ExtendedWebSocket,
    clientId: string,
    data: RawData
  ): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const { clientInfo } = ws;

      if (!clientInfo) {
        this.sendError(ws, 'Client not authenticated');
        return;
      }

      logger.debug({ clientId, type: message.type }, 'Received message');

      switch (message.type) {
        case MessageType.LOCATION_UPDATE:
          await this.handleLocationUpdate(ws, clientInfo, message.payload);
          break;

        case MessageType.NEARBY_DRIVERS:
          await this.handleNearbyDrivers(ws, clientInfo, message.payload);
          break;

        case MessageType.SUBSCRIBE_DRIVER:
          this.handleSubscribeDriver(ws, clientId, clientInfo, message.payload);
          break;

        case MessageType.UNSUBSCRIBE_DRIVER:
          this.handleUnsubscribeDriver(clientId, clientInfo, message.payload);
          break;

        case MessageType.PING:
          this.sendMessage(ws, { type: MessageType.PONG, payload: {} });
          break;

        default:
          logger.warn({ type: message.type }, 'Unknown message type');
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error({ error, clientId }, 'Error processing message');
      this.sendError(ws, 'Invalid message format');
    }
  }

  /**
   * Handle driver location update
   */
  private async handleLocationUpdate(
    ws: ExtendedWebSocket,
    clientInfo: ClientInfo,
    payload: unknown
  ): Promise<void> {
    // Only drivers can send location updates
    if (clientInfo.userType !== 'driver') {
      this.sendError(ws, 'Only drivers can send location updates');
      return;
    }

    try {
      // Validate payload
      const locationData = LocationUpdateSchema.parse(payload);

      // Ensure tenant isolation
      if (config.tenant.enableIsolation && locationData.tenantId !== clientInfo.tenantId) {
        this.sendError(ws, 'Tenant mismatch');
        return;
      }

      // Update location in Redis GEO
      const driverLocation: DriverLocation = {
        ...locationData,
        timestamp: new Date(locationData.timestamp),
        isAvailable: true,
      };

      await redisGeoService.updateDriverLocation(driverLocation);

      // Broadcast to subscribers
      this.broadcastDriverLocation(driverLocation);

      logger.debug(
        { driverId: locationData.driverId, tenantId: locationData.tenantId },
        'Location update processed'
      );
    } catch (error) {
      logger.error({ error }, 'Invalid location update');
      this.sendError(ws, 'Invalid location data');
    }
  }

  /**
   * Handle nearby drivers request
   */
  private async handleNearbyDrivers(
    ws: ExtendedWebSocket,
    clientInfo: ClientInfo,
    payload: unknown
  ): Promise<void> {
    try {
      // Validate payload
      const request = NearbyDriversRequestSchema.parse(payload);

      // Ensure tenant isolation
      if (config.tenant.enableIsolation && request.tenantId !== clientInfo.tenantId) {
        this.sendError(ws, 'Tenant mismatch');
        return;
      }

      // Find nearby drivers
      const drivers = await redisGeoService.findNearbyDrivers(
        request.tenantId,
        request.latitude,
        request.longitude,
        request.radius,
        request.limit
      );

      // Filter by availability and optionally by vehicle type
      const availableDrivers = drivers.filter((d) => {
        if (!d.isAvailable) return false;
        if (request.vehicleType && d.vehicleType !== request.vehicleType) return false;
        return true;
      });

      // Send response
      this.sendMessage(ws, {
        type: MessageType.NEARBY_DRIVERS_RESPONSE,
        payload: availableDrivers,
      });

      logger.debug(
        { tenantId: request.tenantId, count: availableDrivers.length },
        'Nearby drivers query completed'
      );
    } catch (error) {
      logger.error({ error }, 'Invalid nearby drivers request');
      this.sendError(ws, 'Invalid request data');
    }
  }

  /**
   * Handle driver subscription (for tracking assigned driver)
   */
  private handleSubscribeDriver(
    ws: ExtendedWebSocket,
    clientId: string,
    clientInfo: ClientInfo,
    payload: { driverId: string }
  ): void {
    const { driverId } = payload;

    if (!driverId) {
      this.sendError(ws, 'Driver ID required');
      return;
    }

    // Add subscription
    if (!this.driverSubscriptions.has(driverId)) {
      this.driverSubscriptions.set(driverId, new Set());
    }
    this.driverSubscriptions.get(driverId)!.add(clientId);
    clientInfo.subscriptions.add(driverId);

    logger.debug({ clientId, driverId }, 'Client subscribed to driver');
  }

  /**
   * Handle driver unsubscription
   */
  private handleUnsubscribeDriver(
    clientId: string,
    clientInfo: ClientInfo,
    payload: { driverId: string }
  ): void {
    const { driverId } = payload;

    if (!driverId) return;

    // Remove subscription
    this.driverSubscriptions.get(driverId)?.delete(clientId);
    clientInfo.subscriptions.delete(driverId);

    logger.debug({ clientId, driverId }, 'Client unsubscribed from driver');
  }

  /**
   * Broadcast driver location to all subscribers
   */
  private broadcastDriverLocation(location: DriverLocation): void {
    const subscribers = this.driverSubscriptions.get(location.driverId);

    if (!subscribers || subscribers.size === 0) return;

    const message: WebSocketMessage = {
      type: MessageType.DRIVER_LOCATION,
      payload: location,
    };

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    }
  }

  /**
   * Handle pong response (heartbeat)
   */
  private handlePong(ws: ExtendedWebSocket): void {
    ws.isAlive = true;
    if (ws.clientInfo) {
      ws.clientInfo.lastPing = new Date();
    }
  }

  /**
   * Handle client disconnect
   */
  private handleClose(clientId: string, ws: ExtendedWebSocket): void {
    const { clientInfo } = ws;

    // Clean up subscriptions
    if (clientInfo) {
      for (const driverId of clientInfo.subscriptions) {
        this.driverSubscriptions.get(driverId)?.delete(clientId);
      }

      // If driver disconnected, remove from location tracking
      if (clientInfo.userType === 'driver') {
        redisGeoService.removeDriver(clientInfo.tenantId, clientInfo.userId).catch((err) => {
          logger.error({ err }, 'Failed to remove driver on disconnect');
        });
      }
    }

    this.clients.delete(clientId);

    logger.info({ clientId, userId: clientInfo?.userId }, 'Client disconnected');
  }

  /**
   * Handle WebSocket error
   */
  private handleError(clientId: string, error: Error): void {
    logger.error({ error, clientId }, 'WebSocket client error');
  }

  /**
   * Send message to client
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, errorMessage: string): void {
    this.sendMessage(ws, {
      type: MessageType.ERROR,
      payload: { message: errorMessage },
    });
  }

  /**
   * Start heartbeat ping/pong
   */
  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws, clientId) => {
        if (!ws.isAlive) {
          logger.debug({ clientId }, 'Terminating inactive client');
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, config.ws.pingInterval);
  }

  /**
   * Shutdown WebSocket server
   */
  async shutdown(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all client connections
    this.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });

    // Close server
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          logger.info('WebSocket server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    driverConnections: number;
    riderConnections: number;
    subscriptions: number;
  } {
    let driverConnections = 0;
    let riderConnections = 0;

    this.clients.forEach((ws) => {
      if (ws.clientInfo?.userType === 'driver') driverConnections++;
      if (ws.clientInfo?.userType === 'rider') riderConnections++;
    });

    let totalSubscriptions = 0;
    this.driverSubscriptions.forEach((subs) => {
      totalSubscriptions += subs.size;
    });

    return {
      totalConnections: this.clients.size,
      driverConnections,
      riderConnections,
      subscriptions: totalSubscriptions,
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
