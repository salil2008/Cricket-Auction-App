import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useConfigStore, useTeamStore, usePlayerStore } from './stores';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Teams from './pages/admin/Teams';
import Players from './pages/admin/Players';
import Config from './pages/admin/Config';
import AuctionControl from './pages/admin/AuctionControl';

// Presentation Pages
import PresentationLayout from './pages/presentation/PresentationLayout';
import AuctionView from './pages/presentation/AuctionView';
import TeamsView from './pages/presentation/TeamsView';
import PoolView from './pages/presentation/PoolView';
import SplashView from './pages/presentation/SplashView';

function App() {
  const fetchConfig = useConfigStore(state => state.fetchConfig);
  const fetchTeams = useTeamStore(state => state.fetchTeams);
  const fetchPlayers = usePlayerStore(state => state.fetchPlayers);
  
  // Initialize data on app load
  useEffect(() => {
    const initializeData = async () => {
      await fetchConfig();
      await fetchTeams();
      await fetchPlayers();
    };
    initializeData();
  }, [fetchConfig, fetchTeams, fetchPlayers]);
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="teams" element={<Teams />} />
          <Route path="players" element={<Players />} />
          <Route path="config" element={<Config />} />
          <Route path="auction" element={<AuctionControl />} />
        </Route>
        
        {/* Presentation Routes */}
        <Route path="/present" element={<PresentationLayout />}>
          <Route index element={<SplashView />} />
          <Route path="auction" element={<AuctionView />} />
          <Route path="teams" element={<TeamsView />} />
          <Route path="pool" element={<PoolView />} />
          <Route path="splash" element={<SplashView />} />
        </Route>
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
