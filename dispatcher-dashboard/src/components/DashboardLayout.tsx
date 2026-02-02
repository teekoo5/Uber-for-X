import { Outlet, NavLink } from 'react-router-dom';
import {
  Map,
  List,
  Users,
  BarChart3,
  Settings,
  Bell,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useFleetStore } from '../stores/fleetStore';
import clsx from 'clsx';

const navigation = [
  { name: 'Live Map', href: '/map', icon: Map },
  { name: 'Rides', href: '/rides', icon: List },
  { name: 'Drivers', href: '/drivers', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const { isConnected, alerts, stats } = useFleetStore();
  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-500 text-white flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-primary-400">
          <span className="text-xl font-bold">Helsinki Taxi</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-400 text-white'
                    : 'text-primary-100 hover:bg-primary-400/50'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Connection status */}
        <div className="px-4 py-4 border-t border-primary-400">
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6">
          {/* Stats */}
          <div className="flex items-center gap-8">
            <StatBadge
              label="Online Drivers"
              value={stats.onlineDrivers}
              color="green"
            />
            <StatBadge
              label="Active Rides"
              value={stats.activeRides}
              color="blue"
            />
            <StatBadge
              label="Completed Today"
              value={stats.completedToday}
              color="gray"
            />
            <StatBadge
              label="Revenue Today"
              value={`€${stats.revenueToday.toFixed(0)}`}
              color="amber"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Alerts */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <Bell className="w-6 h-6" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadAlerts}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                D
              </div>
              <span className="text-sm font-medium text-gray-700">
                Dispatcher
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'green' | 'blue' | 'gray' | 'amber';
}) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
    amber: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={clsx('text-lg font-semibold', colors[color])}>
        {value}
      </span>
    </div>
  );
}
