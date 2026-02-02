import { useCallback, useRef } from 'react';
import { useFleetStore } from '../stores/fleetStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'helsinki_taxi';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { updateDriver, updateRide, addAlert, updateStats } = useFleetStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    const ws = new WebSocket(
      `${WS_URL}?userId=dispatcher&userType=admin&tenantId=${TENANT_ID}`
    );

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
    return ws;
  }, []);

  const handleMessage = useCallback(
    (message: { type: string; payload: unknown }) => {
      switch (message.type) {
        case 'DRIVER_LOCATION':
          handleDriverLocation(message.payload as DriverLocationPayload);
          break;
        case 'RIDE_UPDATE':
          handleRideUpdate(message.payload as RideUpdatePayload);
          break;
        case 'NEARBY_DRIVERS_RESPONSE':
          handleNearbyDrivers(message.payload as DriverLocationPayload[]);
          break;
        case 'ALERT':
          handleAlert(message.payload as AlertPayload);
          break;
        case 'STATS_UPDATE':
          handleStatsUpdate(message.payload as StatsPayload);
          break;
        case 'CONNECTED':
          console.log('Connected to dispatcher WebSocket');
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    },
    [updateDriver, updateRide, addAlert, updateStats]
  );

  const handleDriverLocation = (payload: DriverLocationPayload) => {
    updateDriver({
      id: payload.driverId,
      name: payload.driverName || 'Unknown Driver',
      phone: payload.phone || '',
      status: payload.isAvailable ? 'online' : 'busy',
      latitude: payload.latitude,
      longitude: payload.longitude,
      heading: payload.heading,
      speed: payload.speed,
      vehicleType: payload.vehicleType || 'standard',
      vehiclePlate: payload.vehiclePlate || '',
      rating: payload.rating || 5.0,
      currentRideId: payload.currentRideId,
      lastUpdate: new Date(),
    });
  };

  const handleNearbyDrivers = (drivers: DriverLocationPayload[]) => {
    drivers.forEach(handleDriverLocation);
  };

  const handleRideUpdate = (payload: RideUpdatePayload) => {
    updateRide({
      id: payload.rideId,
      status: payload.status,
      riderId: payload.riderId,
      riderName: payload.riderName || 'Passenger',
      riderPhone: payload.riderPhone || '',
      driverId: payload.driverId,
      driverName: payload.driverName,
      pickupAddress: payload.pickupAddress,
      pickupLat: payload.pickupLatitude,
      pickupLng: payload.pickupLongitude,
      dropoffAddress: payload.dropoffAddress,
      dropoffLat: payload.dropoffLatitude,
      dropoffLng: payload.dropoffLongitude,
      vehicleType: payload.vehicleType || 'standard',
      estimatedFare: payload.estimatedFare,
      finalFare: payload.finalFare,
      requestedAt: new Date(payload.requestedAt),
      eta: payload.eta,
    });
  };

  const handleAlert = (payload: AlertPayload) => {
    addAlert({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: payload.type as 'sos' | 'idle' | 'speeding' | 'offline' | 'surge',
      severity: payload.severity as 'low' | 'medium' | 'high' | 'critical',
      message: payload.message,
      driverId: payload.driverId,
      rideId: payload.rideId,
      timestamp: new Date(),
      acknowledged: false,
    });
  };

  const handleStatsUpdate = (payload: StatsPayload) => {
    updateStats(payload);
  };

  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const requestNearbyDrivers = useCallback(
    (latitude: number, longitude: number, radius = 10000) => {
      send('NEARBY_DRIVERS', {
        latitude,
        longitude,
        radius,
        tenantId: TENANT_ID,
      });
    },
    [send]
  );

  const assignDriver = useCallback(
    (rideId: string, driverId: string) => {
      send('ASSIGN_DRIVER', { rideId, driverId, tenantId: TENANT_ID });
    },
    [send]
  );

  return {
    connect,
    send,
    requestNearbyDrivers,
    assignDriver,
  };
}

// Payload types
interface DriverLocationPayload {
  driverId: string;
  driverName?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  isAvailable: boolean;
  vehicleType?: string;
  vehiclePlate?: string;
  rating?: number;
  currentRideId?: string;
}

interface RideUpdatePayload {
  rideId: string;
  status: string;
  riderId: string;
  riderName?: string;
  riderPhone?: string;
  driverId?: string;
  driverName?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  vehicleType?: string;
  estimatedFare: number;
  finalFare?: number;
  requestedAt: string;
  eta?: number;
}

interface AlertPayload {
  type: string;
  severity: string;
  message: string;
  driverId?: string;
  rideId?: string;
}

interface StatsPayload {
  onlineDrivers?: number;
  activeRides?: number;
  completedToday?: number;
  revenueToday?: number;
  avgWaitTime?: number;
}
