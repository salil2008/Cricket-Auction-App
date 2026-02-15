import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Settings, 
  Play,
  ExternalLink
} from 'lucide-react';
import { useAuctionStore, VIEWS } from '../../stores';
import { useBroadcast } from '../../hooks';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/teams', icon: Users, label: 'Teams' },
  { to: '/admin/players', icon: UserCircle, label: 'Players' },
  { to: '/admin/config', icon: Settings, label: 'Configuration' },
  { to: '/admin/auction', icon: Play, label: 'Auction Control' }
];

export default function AdminLayout() {
  const location = useLocation();
  const isLive = useAuctionStore(state => state.isLive);
  
  // Initialize broadcast for admin
  useBroadcast(true);
  
  const openPresentation = () => {
    window.open('/present', 'bwpl-presentation', 'width=1920,height=1080');
  };
  
  return (
    <div className="admin-panel flex min-h-screen">
      {/* Sidebar */}
      <aside className="admin-sidebar flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src="/bwc-logo.png" 
              alt="BWC" 
              className="w-12 h-12 rounded-lg object-contain"
            />
            <div>
              <h1 className="font-display font-bold text-white tracking-wide">BWPL</h1>
              <p className="text-xs text-gray-400">Auction System</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${isActive 
                  ? 'bg-[var(--bwpl-primary)]/10 text-[var(--bwpl-primary)] border border-[var(--bwpl-primary)]/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
              {label === 'Auction Control' && isLive && (
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </NavLink>
          ))}
        </nav>
        
        {/* Open Presentation Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={openPresentation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[var(--bwpl-primary)] to-[var(--bwpl-secondary)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
            style={{
              boxShadow: '0 4px 20px rgba(227, 24, 55, 0.3)'
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Open Presentation
          </button>
        </div>
        
        {/* Status */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-gray-400">
              {isLive ? 'Auction Live' : 'Auction Offline'}
            </span>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="admin-content flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
