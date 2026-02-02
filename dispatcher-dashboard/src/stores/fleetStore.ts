import { create } from 'zustand';

// Types
export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'online' | 'offline' | 'busy' | 'arriving';
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  vehicleType: string;
  vehiclePlate: string;
  rating: number;
  currentRideId?: string;
  lastUpdate: Date;
}

export interface Ride {
  id: string;
  status: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  driverId?: string;
  driverName?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType: string;
  estimatedFare: number;
  finalFare?: number;
  requestedAt: Date;
  eta?: number;
}

export interface Alert {
  id: string;
  type: 'sos' | 'idle' | 'speeding' | 'offline' | 'surge';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  driverId?: string;
  rideId?: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface FleetState {
  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Drivers
  drivers: Map<string, Driver>;
  updateDriver: (driver: Driver) => void;
  removeDriver: (driverId: string) => void;

  // Rides
  rides: Map<string, Ride>;
  activeRides: Ride[];
  updateRide: (ride: Ride) => void;
  removeRide: (rideId: string) => void;

  // Alerts
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;

  // Selected items
  selectedDriverId: string | null;
  selectedRideId: string | null;
  selectDriver: (driverId: string | null) => void;
  selectRide: (rideId: string | null) => void;

  // Map view
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  setMapCenter: (lat: number, lng: number) => void;
  setMapZoom: (zoom: number) => void;

  // Stats
  stats: {
    onlineDrivers: number;
    activeRides: number;
    completedToday: number;
    revenueToday: number;
    avgWaitTime: number;
  };
  updateStats: (stats: Partial<FleetState['stats']>) => void;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  // Connection
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Drivers
  drivers: new Map(),
  updateDriver: (driver) => {
    const drivers = new Map(get().drivers);
    drivers.set(driver.id, { ...driver, lastUpdate: new Date() });
    
    // Update stats
    const onlineDrivers = Array.from(drivers.values()).filter(
      (d) => d.status !== 'offline'
    ).length;
    
    set({ drivers, stats: { ...get().stats, onlineDrivers } });
  },
  removeDriver: (driverId) => {
    const drivers = new Map(get().drivers);
    drivers.delete(driverId);
    set({ drivers });
  },

  // Rides
  rides: new Map(),
  get activeRides() {
    return Array.from(get().rides.values()).filter((r) =>
      ['requested', 'searching', 'driver_assigned', 'driver_arriving', 'arrived', 'in_progress'].includes(r.status)
    );
  },
  updateRide: (ride) => {
    const rides = new Map(get().rides);
    rides.set(ride.id, ride);
    
    // Update active rides count
    const activeRides = Array.from(rides.values()).filter((r) =>
      ['requested', 'searching', 'driver_assigned', 'driver_arriving', 'arrived', 'in_progress'].includes(r.status)
    ).length;
    
    set({ rides, stats: { ...get().stats, activeRides } });
  },
  removeRide: (rideId) => {
    const rides = new Map(get().rides);
    rides.delete(rideId);
    set({ rides });
  },

  // Alerts
  alerts: [],
  addAlert: (alert) => {
    set({ alerts: [alert, ...get().alerts].slice(0, 100) }); // Keep last 100
  },
  acknowledgeAlert: (alertId) => {
    set({
      alerts: get().alerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
    });
  },
  clearAlerts: () => set({ alerts: [] }),

  // Selected items
  selectedDriverId: null,
  selectedRideId: null,
  selectDriver: (driverId) => set({ selectedDriverId: driverId }),
  selectRide: (rideId) => set({ selectedRideId: rideId }),

  // Map view (Helsinki center)
  mapCenter: { lat: 60.1699, lng: 24.9384 },
  mapZoom: 12,
  setMapCenter: (lat, lng) => set({ mapCenter: { lat, lng } }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),

  // Stats
  stats: {
    onlineDrivers: 0,
    activeRides: 0,
    completedToday: 0,
    revenueToday: 0,
    avgWaitTime: 0,
  },
  updateStats: (stats) => set({ stats: { ...get().stats, ...stats } }),
}));
