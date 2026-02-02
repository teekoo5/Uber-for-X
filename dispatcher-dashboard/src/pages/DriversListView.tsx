import { useState } from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { Search, Phone, Star, Car, MapPin, Clock } from 'lucide-react';
import clsx from 'clsx';

type StatusFilter = 'all' | 'online' | 'busy' | 'offline';

export default function DriversListView() {
  const { drivers, selectDriver } = useFleetStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const driverList = Array.from(drivers.values());

  const filteredDrivers = driverList.filter((driver) => {
    // Status filter
    if (statusFilter !== 'all' && driver.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        driver.name.toLowerCase().includes(query) ||
        driver.vehiclePlate.toLowerCase().includes(query) ||
        driver.phone.includes(query)
      );
    }

    return true;
  });

  const statusCounts = {
    all: driverList.length,
    online: driverList.filter((d) => d.status === 'online').length,
    busy: driverList.filter((d) => d.status === 'busy').length,
    offline: driverList.filter((d) => d.status === 'offline').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-green-600">
              {statusCounts.online}
            </span>{' '}
            online •{' '}
            <span className="font-medium text-blue-600">
              {statusCounts.busy}
            </span>{' '}
            busy
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, plate, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Status tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['all', 'online', 'busy', 'offline'] as StatusFilter[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  statusFilter === status
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} (
                {statusCounts[status]})
              </button>
            )
          )}
        </div>
      </div>

      {/* Driver cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No drivers found
          </div>
        ) : (
          filteredDrivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => selectDriver(driver.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {driver.name}
                    </h3>
                    <p className="text-sm text-gray-500">{driver.vehiclePlate}</p>
                  </div>
                </div>
                <StatusIndicator status={driver.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{driver.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Car className="w-4 h-4 text-gray-400" />
                  <span>{driver.vehicleType}</span>
                </div>
              </div>

              {driver.status !== 'offline' && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span>{driver.speed.toFixed(0)} km/h</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(driver.lastUpdate).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <a
                  href={`tel:${driver.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Call</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const config = {
    online: { color: 'bg-green-500', label: 'Online' },
    busy: { color: 'bg-blue-500', label: 'Busy' },
    offline: { color: 'bg-gray-400', label: 'Offline' },
    arriving: { color: 'bg-yellow-500', label: 'Arriving' },
  }[status] || { color: 'bg-gray-400', label: status };

  return (
    <div className="flex items-center gap-2">
      <span className={clsx('w-2 h-2 rounded-full', config.color)} />
      <span className="text-sm text-gray-600">{config.label}</span>
    </div>
  );
}
