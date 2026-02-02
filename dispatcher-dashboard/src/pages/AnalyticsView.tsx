import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Clock,
  Users,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';

type TimeRange = 'today' | 'week' | 'month';

export default function AnalyticsView() {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  // Mock data - in production, fetch from API
  const stats = {
    today: {
      revenue: 4523.5,
      revenueChange: 12.5,
      rides: 187,
      ridesChange: 8.2,
      avgWaitTime: 4.2,
      waitTimeChange: -15.3,
      activeDrivers: 42,
      driversChange: 5.0,
    },
    week: {
      revenue: 28456.0,
      revenueChange: 8.3,
      rides: 1245,
      ridesChange: 6.1,
      avgWaitTime: 4.8,
      waitTimeChange: -8.5,
      activeDrivers: 58,
      driversChange: 12.0,
    },
    month: {
      revenue: 112340.0,
      revenueChange: 15.2,
      rides: 5123,
      ridesChange: 11.4,
      avgWaitTime: 5.1,
      waitTimeChange: -5.2,
      activeDrivers: 72,
      driversChange: 18.0,
    },
  };

  const currentStats = stats[timeRange];

  const hourlyData = [
    { hour: '00:00', rides: 12, revenue: 234 },
    { hour: '02:00', rides: 8, revenue: 156 },
    { hour: '04:00', rides: 5, revenue: 98 },
    { hour: '06:00', rides: 15, revenue: 287 },
    { hour: '08:00', rides: 45, revenue: 876 },
    { hour: '10:00', rides: 38, revenue: 732 },
    { hour: '12:00', rides: 42, revenue: 814 },
    { hour: '14:00', rides: 35, revenue: 678 },
    { hour: '16:00', rides: 48, revenue: 934 },
    { hour: '18:00', rides: 52, revenue: 1012 },
    { hour: '20:00', rides: 38, revenue: 743 },
    { hour: '22:00', rides: 25, revenue: 487 },
  ];

  const topDrivers = [
    { name: 'Matti Virtanen', rides: 24, revenue: 456.5, rating: 4.95 },
    { name: 'Pekka Korhonen', rides: 22, revenue: 423.0, rating: 4.88 },
    { name: 'Jukka Mäkinen', rides: 20, revenue: 398.5, rating: 4.92 },
    { name: 'Antti Laine', rides: 18, revenue: 356.0, rating: 4.85 },
    { name: 'Mikko Niemi', rides: 17, revenue: 334.5, rating: 4.90 },
  ];

  const popularRoutes = [
    { from: 'Central Station', to: 'Airport', count: 45, avgFare: 42.5 },
    { from: 'Kamppi', to: 'Pasila', count: 38, avgFare: 15.5 },
    { from: 'Airport', to: 'City Center', count: 35, avgFare: 45.0 },
    { from: 'Kallio', to: 'Espoo', count: 28, avgFare: 28.0 },
    { from: 'Töölö', to: 'Vuosaari', count: 22, avgFare: 32.5 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
                timeRange === range
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Calendar className="w-4 h-4" />
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={`€${currentStats.revenue.toLocaleString()}`}
          change={currentStats.revenueChange}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Total Rides"
          value={currentStats.rides.toLocaleString()}
          change={currentStats.ridesChange}
          icon={Car}
          color="blue"
        />
        <StatCard
          title="Avg Wait Time"
          value={`${currentStats.avgWaitTime} min`}
          change={currentStats.waitTimeChange}
          icon={Clock}
          color="purple"
          inverseChange
        />
        <StatCard
          title="Active Drivers"
          value={currentStats.activeDrivers.toString()}
          change={currentStats.driversChange}
          icon={Users}
          color="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly activity chart placeholder */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Hourly Activity
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {hourlyData.map((data) => (
              <div key={data.hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary-500 rounded-t"
                  style={{ height: `${(data.rides / 52) * 100}%` }}
                />
                <span className="text-xs text-gray-500 mt-2 rotate-45">
                  {data.hour}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by hour */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue by Hour
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {hourlyData.map((data) => (
              <div key={data.hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-green-500 rounded-t"
                  style={{ height: `${(data.revenue / 1012) * 100}%` }}
                />
                <span className="text-xs text-gray-500 mt-2 rotate-45">
                  {data.hour}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top drivers */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Drivers
          </h3>
          <div className="space-y-3">
            {topDrivers.map((driver, index) => (
              <div
                key={driver.name}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{driver.name}</p>
                    <p className="text-sm text-gray-500">
                      {driver.rides} rides • ★ {driver.rating}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-green-600">
                  €{driver.revenue.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular routes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Popular Routes
          </h3>
          <div className="space-y-3">
            {popularRoutes.map((route) => (
              <div
                key={`${route.from}-${route.to}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {route.from} → {route.to}
                  </p>
                  <p className="text-sm text-gray-500">
                    {route.count} rides • Avg €{route.avgFare.toFixed(0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    €{(route.count * route.avgFare).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">total</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  inverseChange = false,
}: {
  title: string;
  value: string;
  change: number;
  icon: typeof TrendingUp;
  color: 'green' | 'blue' | 'purple' | 'amber';
  inverseChange?: boolean;
}) {
  const isPositive = inverseChange ? change < 0 : change > 0;
  const bgColors = {
    green: 'bg-green-100',
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
    amber: 'bg-amber-100',
  };
  const iconColors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div
          className={clsx(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            bgColors[color]
          )}
        >
          <Icon className={clsx('w-6 h-6', iconColors[color])} />
        </div>
        <div
          className={clsx(
            'flex items-center gap-1 text-sm font-medium',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );
}
