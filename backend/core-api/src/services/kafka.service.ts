/**
 * Kafka Service
 * 
 * Event-driven messaging backbone for the mobility platform.
 * 
 * Topics:
 * - ride.requested - New ride request created
 * - ride.assigned - Driver assigned to ride
 * - ride.status - Ride status updates
 * - ride.completed - Ride completed
 * - driver.location - Driver location updates
 * - payment.processed - Payment completed
 * - notification.push - Push notification triggers
 */

import { Kafka, Producer, Consumer, EachMessagePayload, Admin } from 'kafkajs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Event types
export enum EventType {
  // Ride events
  RIDE_REQUESTED = 'ride.requested',
  RIDE_SEARCHING = 'ride.searching',
  RIDE_ASSIGNED = 'ride.assigned',
  RIDE_DRIVER_ARRIVING = 'ride.driver_arriving',
  RIDE_DRIVER_ARRIVED = 'ride.driver_arrived',
  RIDE_STARTED = 'ride.started',
  RIDE_COMPLETED = 'ride.completed',
  RIDE_CANCELLED = 'ride.cancelled',
  
  // Driver events
  DRIVER_ONLINE = 'driver.online',
  DRIVER_OFFLINE = 'driver.offline',
  DRIVER_LOCATION = 'driver.location',
  
  // Payment events
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // Notification events
  NOTIFICATION_PUSH = 'notification.push',
  NOTIFICATION_SMS = 'notification.sms',
  NOTIFICATION_EMAIL = 'notification.email',
}

// Base event interface
export interface BaseEvent {
  id: string;
  type: EventType;
  tenantId: string;
  timestamp: string;
  correlationId?: string;
}

// Ride event payloads
export interface RideRequestedEvent extends BaseEvent {
  type: EventType.RIDE_REQUESTED;
  payload: {
    rideId: string;
    riderId: string;
    pickupLatitude: number;
    pickupLongitude: number;
    pickupAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    dropoffAddress: string;
    vehicleType: string;
    estimatedFare: number;
  };
}

export interface RideAssignedEvent extends BaseEvent {
  type: EventType.RIDE_ASSIGNED;
  payload: {
    rideId: string;
    riderId: string;
    driverId: string;
    vehicleId: string;
    eta: number;
  };
}

export interface RideStatusEvent extends BaseEvent {
  type: EventType.RIDE_STARTED | EventType.RIDE_COMPLETED | EventType.RIDE_CANCELLED;
  payload: {
    rideId: string;
    riderId: string;
    driverId: string;
    status: string;
    finalFare?: number;
    cancellationReason?: string;
  };
}

// Driver location event
export interface DriverLocationEvent extends BaseEvent {
  type: EventType.DRIVER_LOCATION;
  payload: {
    driverId: string;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    accuracy: number;
  };
}

// Payment event
export interface PaymentEvent extends BaseEvent {
  type: EventType.PAYMENT_COMPLETED | EventType.PAYMENT_FAILED;
  payload: {
    paymentId: string;
    rideId: string;
    riderId: string;
    driverId: string;
    amount: number;
    currency: string;
    status: string;
  };
}

// Notification event
export interface NotificationEvent extends BaseEvent {
  type: EventType.NOTIFICATION_PUSH;
  payload: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  };
}

type MobilityEvent = 
  | RideRequestedEvent 
  | RideAssignedEvent 
  | RideStatusEvent 
  | DriverLocationEvent 
  | PaymentEvent 
  | NotificationEvent;

// Event handler type
type EventHandler = (event: MobilityEvent) => Promise<void>;

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private admin: Admin | null = null;
  private isConnected = false;
  private handlers: Map<EventType, EventHandler[]> = new Map();

  // Topics configuration
  private readonly topics = {
    rides: 'mobility.rides',
    drivers: 'mobility.drivers',
    payments: 'mobility.payments',
    notifications: 'mobility.notifications',
  };

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
  }

  /**
   * Initialize Kafka connection and create topics
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Create admin client
      this.admin = this.kafka.admin();
      await this.admin.connect();

      // Create topics if they don't exist
      await this.createTopics();

      // Create producer
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      });
      await this.producer.connect();

      // Create consumer
      this.consumer = this.kafka.consumer({
        groupId: config.kafka.groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });
      await this.consumer.connect();

      this.isConnected = true;
      logger.info('Kafka service connected');
    } catch (err) {
      logger.error({ err }, 'Failed to connect to Kafka');
      throw err;
    }
  }

  /**
   * Create required topics
   */
  private async createTopics(): Promise<void> {
    if (!this.admin) return;

    const topicList = Object.values(this.topics);
    const existingTopics = await this.admin.listTopics();

    const topicsToCreate = topicList
      .filter((topic) => !existingTopics.includes(topic))
      .map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
        configEntries: [
          { name: 'retention.ms', value: '604800000' }, // 7 days
        ],
      }));

    if (topicsToCreate.length > 0) {
      await this.admin.createTopics({ topics: topicsToCreate });
      logger.info({ topics: topicsToCreate.map(t => t.topic) }, 'Created Kafka topics');
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    await this.consumer?.disconnect();
    await this.producer?.disconnect();
    await this.admin?.disconnect();
    this.isConnected = false;
    logger.info('Kafka service disconnected');
  }

  /**
   * Publish an event to Kafka
   */
  async publish(event: MobilityEvent): Promise<void> {
    if (!this.producer || !this.isConnected) {
      logger.warn('Kafka not connected, skipping event publish');
      return;
    }

    const topic = this.getTopicForEvent(event.type);
    const key = this.getKeyForEvent(event);

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(event),
            headers: {
              'event-type': event.type,
              'tenant-id': event.tenantId,
              'correlation-id': event.correlationId || '',
            },
          },
        ],
      });

      logger.debug({ eventType: event.type, topic, key }, 'Event published');
    } catch (err) {
      logger.error({ err, event }, 'Failed to publish event');
      throw err;
    }
  }

  /**
   * Subscribe to events
   */
  async subscribe(
    eventTypes: EventType[],
    handler: EventHandler
  ): Promise<void> {
    // Register handlers
    for (const eventType of eventTypes) {
      const handlers = this.handlers.get(eventType) || [];
      handlers.push(handler);
      this.handlers.set(eventType, handlers);
    }

    // Subscribe to relevant topics
    const topics = new Set(eventTypes.map((t) => this.getTopicForEvent(t)));
    
    for (const topic of topics) {
      await this.consumer?.subscribe({ topic, fromBeginning: false });
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming(): Promise<void> {
    if (!this.consumer) return;

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    logger.info('Kafka consumer started');
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      const eventType = message.headers?.['event-type']?.toString() as EventType;
      const value = message.value?.toString();

      if (!value || !eventType) {
        logger.warn({ topic, partition }, 'Invalid message format');
        return;
      }

      const event: MobilityEvent = JSON.parse(value);
      const handlers = this.handlers.get(eventType) || [];

      logger.debug({
        eventType,
        topic,
        partition,
        offset: message.offset,
        handlersCount: handlers.length,
      }, 'Processing message');

      // Execute all handlers for this event type
      await Promise.all(handlers.map((handler) => handler(event)));
    } catch (err) {
      logger.error({ err, topic, partition }, 'Error processing message');
    }
  }

  /**
   * Get topic for event type
   */
  private getTopicForEvent(eventType: EventType): string {
    if (eventType.startsWith('ride.')) return this.topics.rides;
    if (eventType.startsWith('driver.')) return this.topics.drivers;
    if (eventType.startsWith('payment.')) return this.topics.payments;
    if (eventType.startsWith('notification.')) return this.topics.notifications;
    return this.topics.rides; // Default
  }

  /**
   * Get partition key for event
   */
  private getKeyForEvent(event: MobilityEvent): string {
    // Use rideId or driverId as partition key for ordering
    const payload = event.payload as Record<string, unknown>;
    return (payload.rideId || payload.driverId || event.tenantId) as string;
  }

  // =========================================================================
  // Helper methods for publishing specific events
  // =========================================================================

  /**
   * Publish ride requested event
   */
  async publishRideRequested(
    tenantId: string,
    rideId: string,
    riderId: string,
    pickup: { latitude: number; longitude: number; address: string },
    dropoff: { latitude: number; longitude: number; address: string },
    vehicleType: string,
    estimatedFare: number
  ): Promise<void> {
    const event: RideRequestedEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: EventType.RIDE_REQUESTED,
      tenantId,
      timestamp: new Date().toISOString(),
      correlationId: rideId,
      payload: {
        rideId,
        riderId,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        pickupAddress: pickup.address,
        dropoffLatitude: dropoff.latitude,
        dropoffLongitude: dropoff.longitude,
        dropoffAddress: dropoff.address,
        vehicleType,
        estimatedFare,
      },
    };

    await this.publish(event);
  }

  /**
   * Publish ride assigned event
   */
  async publishRideAssigned(
    tenantId: string,
    rideId: string,
    riderId: string,
    driverId: string,
    vehicleId: string,
    eta: number
  ): Promise<void> {
    const event: RideAssignedEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: EventType.RIDE_ASSIGNED,
      tenantId,
      timestamp: new Date().toISOString(),
      correlationId: rideId,
      payload: {
        rideId,
        riderId,
        driverId,
        vehicleId,
        eta,
      },
    };

    await this.publish(event);
  }

  /**
   * Publish ride completed event
   */
  async publishRideCompleted(
    tenantId: string,
    rideId: string,
    riderId: string,
    driverId: string,
    finalFare: number
  ): Promise<void> {
    const event: RideStatusEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: EventType.RIDE_COMPLETED,
      tenantId,
      timestamp: new Date().toISOString(),
      correlationId: rideId,
      payload: {
        rideId,
        riderId,
        driverId,
        status: 'completed',
        finalFare,
      },
    };

    await this.publish(event);
  }

  /**
   * Publish push notification event
   */
  async publishPushNotification(
    tenantId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    const event: NotificationEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: EventType.NOTIFICATION_PUSH,
      tenantId,
      timestamp: new Date().toISOString(),
      payload: {
        userId,
        title,
        body,
        data,
      },
    };

    await this.publish(event);
  }
}

// Export singleton instance
export const kafkaService = new KafkaService();
