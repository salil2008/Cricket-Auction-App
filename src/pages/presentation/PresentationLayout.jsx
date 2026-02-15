import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuctionStore, usePlayerStore, useTeamStore, VIEWS } from '../../stores';
import { useBroadcast, useSound } from '../../hooks';

// Map store views to routes
const viewRoutes = {
  [VIEWS.AUCTION]: '/present/auction',
  [VIEWS.TEAMS]: '/present/teams',
  [VIEWS.POOL]: '/present/pool',
  [VIEWS.SPLASH]: '/present/splash',
  [VIEWS.BREAK]: '/present/splash'
};

export default function PresentationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeView = useAuctionStore(state => state.activeView);
  const fetchPlayers = usePlayerStore(state => state.fetchPlayers);
  const fetchTeams = useTeamStore(state => state.fetchTeams);
  
  // Initialize broadcast listener for presentation
  useBroadcast(false);
  
  // Initialize sound system
  useSound();
  
  // Periodic data refresh to keep presenter in sync
  useEffect(() => {
    // Initial fetch
    fetchPlayers();
    fetchTeams();
    
    // Poll every 5 seconds as backup sync
    const interval = setInterval(() => {
      fetchPlayers();
      fetchTeams();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchPlayers, fetchTeams]);
  
  // Navigate when view changes
  useEffect(() => {
    const targetRoute = viewRoutes[activeView];
    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  }, [activeView, navigate, location.pathname]);
  
  return (
    <div className="presentation-view">
      {/* Grid Overlay */}
      <div className="grid-overlay" />
      
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Top-left glow */}
        <div 
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--bwpl-primary), transparent)' }}
        />
        {/* Bottom-right glow */}
        <div 
          className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--bwpl-secondary), transparent)' }}
        />
      </div>
      
      {/* Page Content with Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 h-full"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
