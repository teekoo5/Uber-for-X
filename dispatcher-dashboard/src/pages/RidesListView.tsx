import { useState } from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { Search, Filter, Download, Clock, CheckCircle, XCircle, Car } from 'lucide-react';
import clsx from 'clsx';

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export default function RidesListView() {
  const { rides } = useFleetStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const rideList = Array.from(rides.values());

  const filteredRides = rideList.filter((ride) => {
    // Status filter
    if (statusFilter === 'active') {
      if (!['requested', 'searching', 'driver_assigned', 'driver_arriving', 'arrived', 'in_progress'].includes(ride.status)) {
        return false;
      }
    } else if (statusFilter === 'completed') {
      if (ride.status !== 'completed') return false;
    } else if (statusFilter === 'cancelled') {
      if (!ride.status.includes('cancelled')) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ride.riderName.toLowerCase().includes(query) ||
        ride.pickupAddress.toLowerCase().includes(query) ||
        ride.dropoffAddress.toLowerCase().includes(query) ||
        ride.id.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const statusCounts = {
    all: rideList.length,
    active: rideList.filter((r) =>
      ['requested', 'searching', 'driver_assigned', 'driver_arriving', 'arrived', 'in_progress'].includes(r.status)
    ).length,
    completed: rideList.filter((r) => r.status === 'completed').length,
    cancelled: rideList.filter((r) => r.status.includes('cancelled')).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rides</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by passenger, address, or ride ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Status tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['all', 'active', 'completed', 'cancelled'] as StatusFilter[]).map(
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ride ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Passenger
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Route
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fare
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRides.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No rides found
                </td>
              </tr>
            ) : (
              filteredRides.map((ride) => (
                <tr key={ride.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-600">
                      {ride.id.substring(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {ride.riderName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ride.riderPhone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-gray-900 truncate max-w-[200px]">
                          {ride.pickupAddress}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-gray-600 truncate max-w-[200px]">
                          {ride.dropoffAddress}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ride.driverName ? (
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {ride.driverName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={ride.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="font-medium text-gray-900">
                      €{(ride.finalFare || ride.estimatedFare).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ride.requestedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'requested':
      case 'searching':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'driver_assigned':
      case 'driver_arriving':
      case 'arrived':
        return { color: 'bg-blue-100 text-blue-800', icon: Car };
      case 'in_progress':
        return { color: 'bg-purple-100 text-purple-800', icon: Car };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'cancelled_by_rider':
      case 'cancelled_by_driver':
        return { color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.color
      )}
    >
      <Icon className="w-3 h-3" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
