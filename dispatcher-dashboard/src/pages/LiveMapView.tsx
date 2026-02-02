import { useEffect, useState } from 'react';
import { useFleetStore, Driver, Ride } from '../stores/fleetStore';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  Car,
  MapPin,
  Navigation,
  Phone,
  Clock,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';

export default function LiveMapView() {
  const {
    drivers,
    rides,
    alerts,
    selectedDriverId,
    selectedRideId,
    selectDriver,
    selectRide,
    mapCenter,
  } = useFleetStore();
  const { requestNearbyDrivers, assignDriver } = useWebSocket();

  const [showDrivers, setShowDrivers] = useState(true);
  const [showRides, setShowRides] = useState(true);

  // Request nearby drivers on mount
  useEffect(() => {
    requestNearbyDrivers(mapCenter.lat, mapCenter.lng);
    const interval = setInterval(() => {
      requestNearbyDrivers(mapCenter.lat, mapCenter.lng);
    }, 10000);
    return () => clearInterval(interval);
  }, [mapCenter, requestNearbyDrivers]);

  const driverList = Array.from(drivers.values());
  const rideList = Array.from(rides.values());
  const activeRides = rideList.filter((r) =>
    ['requested', 'searching', 'driver_assigned', 'driver_arriving', 'arrived', 'in_progress'].includes(r.status)
  );
  const unassignedRides = rideList.filter((r) =>
    ['requested', 'searching'].includes(r.status)
  );
  const criticalAlerts = alerts.filter(
    (a) => !a.acknowledged && ['high', 'critical'].includes(a.severity)
  );

  const selectedDriver = selectedDriverId
    ? drivers.get(selectedDriverId)
    : null;
  const selectedRide = selectedRideId ? rides.get(selectedRideId) : null;

  return (
    <div className="flex h-full">
      {/* Map area */}
      <div className="flex-1 relative">
        {/* Map placeholder - In production, use @react-google-maps/api */}
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-600 text-lg font-medium">Live Map View</p>
            <p className="text-gray-500 text-sm mt-1">
              Helsinki, Finland ({mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)})
            </p>
            <p className="text-gray-400 text-sm mt-4">
              {driverList.length} drivers • {activeRides.length} active rides
            </p>
          </div>
        </div>

        {/* Map overlay - Driver markers (simplified) */}
        <div className="absolute top-4 left-4 space-y-2">
          {driverList.slice(0, 5).map((driver) => (
            <button
              key={driver.id}
              onClick={() => selectDriver(driver.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg shadow-md',
                driver.status === 'online'
                  ? 'bg-green-500 text-white'
                  : driver.status === 'busy'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-500 text-white'
              )}
            >
              <Car className="w-4 h-4" />
              <span className="text-sm font-medium">{driver.name}</span>
            </button>
          ))}
        </div>

        {/* Critical alerts banner */}
        {criticalAlerts.length > 0 && (
          <div className="absolute top-4 right-4 left-1/3 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">
              {criticalAlerts.length} critical alert(s) require attention
            </span>
          </div>
        )}

        {/* Map controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => setShowDrivers(!showDrivers)}
            className={clsx(
              'px-3 py-2 rounded-lg shadow-md text-sm font-medium',
              showDrivers ? 'bg-primary-500 text-white' : 'bg-white text-gray-700'
            )}
          >
            <Car className="w-4 h-4 inline mr-2" />
            Drivers ({driverList.length})
          </button>
          <button
            onClick={() => setShowRides(!showRides)}
            className={clsx(
              'px-3 py-2 rounded-lg shadow-md text-sm font-medium',
              showRides ? 'bg-primary-500 text-white' : 'bg-white text-gray-700'
            )}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Rides ({activeRides.length})
          </button>
        </div>
      </div>

      {/* Side panel */}
      <aside className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedDriver
              ? 'Driver Details'
              : selectedRide
              ? 'Ride Details'
              : 'Unassigned Rides'}
          </h2>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-auto">
          {selectedDriver ? (
            <DriverDetails
              driver={selectedDriver}
              onClose={() => selectDriver(null)}
            />
          ) : selectedRide ? (
            <RideDetails
              ride={selectedRide}
              availableDrivers={driverList.filter((d) => d.status === 'online')}
              onAssignDriver={(driverId) => {
                assignDriver(selectedRide.id, driverId);
              }}
              onClose={() => selectRide(null)}
            />
          ) : (
            <UnassignedRidesList
              rides={unassignedRides}
              onSelectRide={selectRide}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function DriverDetails({
  driver,
  onClose,
}: {
  driver: Driver;
  onClose: () => void;
}) {
  const statusColors = {
    online: 'bg-green-100 text-green-800',
    offline: 'bg-gray-100 text-gray-800',
    busy: 'bg-blue-100 text-blue-800',
    arriving: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={onClose}
        className="text-sm text-primary-500 hover:text-primary-600"
      >
        ← Back to list
      </button>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
          <Car className="w-8 h-8 text-primary-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
          <span
            className={clsx(
              'inline-flex px-2 py-1 text-xs rounded-full',
              statusColors[driver.status]
            )}
          >
            {driver.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Vehicle" value={driver.vehicleType} />
        <InfoCard label="Plate" value={driver.vehiclePlate} />
        <InfoCard label="Rating" value={`${driver.rating.toFixed(1)} ★`} />
        <InfoCard label="Speed" value={`${driver.speed.toFixed(0)} km/h`} />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Contact</h4>
        <a
          href={`tel:${driver.phone}`}
          className="flex items-center gap-2 text-primary-500 hover:text-primary-600"
        >
          <Phone className="w-4 h-4" />
          {driver.phone}
        </a>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Location</h4>
        <p className="text-sm text-gray-600">
          {driver.latitude.toFixed(5)}, {driver.longitude.toFixed(5)}
        </p>
        <p className="text-xs text-gray-500">
          Heading: {driver.heading.toFixed(0)}° • Last update:{' '}
          {new Date(driver.lastUpdate).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function RideDetails({
  ride,
  availableDrivers,
  onAssignDriver,
  onClose,
}: {
  ride: Ride;
  availableDrivers: Driver[];
  onAssignDriver: (driverId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <button
        onClick={onClose}
        className="text-sm text-primary-500 hover:text-primary-600"
      >
        ← Back to list
      </button>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <div>
            <p className="text-xs text-gray-500">Pickup</p>
            <p className="text-sm font-medium">{ride.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <div>
            <p className="text-xs text-gray-500">Dropoff</p>
            <p className="text-sm font-medium">{ride.dropoffAddress}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Passenger" value={ride.riderName} />
        <InfoCard label="Vehicle Type" value={ride.vehicleType} />
        <InfoCard label="Est. Fare" value={`€${ride.estimatedFare.toFixed(2)}`} />
        <InfoCard label="Status" value={ride.status} />
      </div>

      {/* Manual assignment */}
      {['requested', 'searching'].includes(ride.status) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Assign Driver</h4>
          <div className="space-y-2 max-h-48 overflow-auto">
            {availableDrivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => onAssignDriver(driver.id)}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{driver.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UnassignedRidesList({
  rides,
  onSelectRide,
}: {
  rides: Ride[];
  onSelectRide: (rideId: string) => void;
}) {
  if (rides.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No unassigned rides</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {rides.map((ride) => (
        <button
          key={ride.id}
          onClick={() => onSelectRide(ride.id)}
          className="w-full p-4 hover:bg-gray-50 text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              {ride.riderName}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(ride.requestedAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">{ride.pickupAddress}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              {ride.vehicleType}
            </span>
            <span className="text-xs text-gray-500">
              €{ride.estimatedFare.toFixed(2)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
