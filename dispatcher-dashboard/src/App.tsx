import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import DashboardLayout from './components/DashboardLayout';
import LiveMapView from './pages/LiveMapView';
import RidesListView from './pages/RidesListView';
import DriversListView from './pages/DriversListView';
import AnalyticsView from './pages/AnalyticsView';
import SettingsView from './pages/SettingsView';
import { useWebSocket } from './hooks/useWebSocket';
import { useFleetStore } from './stores/fleetStore';

function App() {
  const { connect } = useWebSocket();
  const { setConnected } = useFleetStore();

  useEffect(() => {
    // Connect to WebSocket on mount
    const ws = connect();
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [connect, setConnected]);

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/map" replace />} />
        <Route path="map" element={<LiveMapView />} />
        <Route path="rides" element={<RidesListView />} />
        <Route path="drivers" element={<DriversListView />} />
        <Route path="analytics" element={<AnalyticsView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>
    </Routes>
  );
}

export default App;
