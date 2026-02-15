import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Star, Shield, Zap, User, Check, X } from 'lucide-react';
import { usePlayerStore, useTeamStore, useConfigStore, useAuctionStore } from '../../stores';
import { formatCurrency, getTierInfo, getRoleIcon } from '../../utils';

const tierIcons = {
  's-class': Crown,
  'a-class': Star,
  'b-class': Shield,
  'c-class': Zap,
  'd-class': User
};

export default function PoolView() {
  const players = usePlayerStore(state => state.players);
  const teams = useTeamStore(state => state.teams);
  const config = useConfigStore(state => state.config);
  const { poolFilter, poolTierFilter } = useAuctionStore();
  
  // Filtered and grouped players
  const filteredPlayers = useMemo(() => {
    let filtered = [...players];
    
    // Status filter
    if (poolFilter && poolFilter !== 'all') {
      filtered = filtered.filter(p => p.status === poolFilter);
    }
    
    // Tier filter
    if (poolTierFilter) {
      filtered = filtered.filter(p => p.tier === poolTierFilter);
    }
    
    return filtered;
  }, [players, poolFilter, poolTierFilter]);
  
  // Stats
  const stats = useMemo(() => ({
    total: players.length,
    sold: players.filter(p => p.status === 'sold').length,
    unsold: players.filter(p => p.status === 'unsold').length,
    available: players.filter(p => p.status === 'available').length
  }), [players]);
  
  // Get team for a player
  const getTeam = (teamId) => teams.find(t => t.id === teamId);
  
  // Get tier color
  const getTierColor = (tier) => {
    const tierConfig = config?.tiers?.find(t => t.id === tier);
    return tierConfig?.color || '#6b7280';
  };
  
  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-6 mb-4">
          <img src="/bwpl-2026-logo.png" alt="BWPL 2026" className="w-20 h-auto" />
          <h1 className="text-5xl font-display font-bold text-white">
            PLAYER <span className="text-[var(--bwpl-primary)]">POOL</span>
          </h1>
        </div>
        
        {/* Stats Bar */}
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--bwpl-secondary)]" />
            <span className="text-gray-400">Available:</span>
            <span className="text-white font-bold">{stats.available}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400">Sold:</span>
            <span className="text-white font-bold">{stats.sold}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--bwpl-primary)]" />
            <span className="text-gray-400">Unsold:</span>
            <span className="text-white font-bold">{stats.unsold}</span>
          </div>
        </div>
      </motion.div>
      
      {/* Player Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredPlayers.map((player, index) => {
            const TierIcon = tierIcons[player.tier] || Shield;
            const team = player.soldToTeamId ? getTeam(player.soldToTeamId) : null;
            const tierColor = getTierColor(player.tier);
            
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`relative rounded-xl overflow-hidden ${
                  player.status === 'unsold' ? 'opacity-50 grayscale' : ''
                }`}
              >
                {/* Card */}
                <div 
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                  style={{
                    borderTopColor: tierColor,
                    borderTopWidth: '3px'
                  }}
                >
                  {/* Photo */}
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white/5 mb-3">
                    {player.photo ? (
                      <img 
                        src={player.photo}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {getRoleIcon(player.role)}
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    {player.status === 'sold' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {player.status === 'unsold' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <X className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    {/* Team Logo Overlay (if sold) */}
                    {team && (
                      <div className="absolute bottom-2 left-2">
                        {team.logo ? (
                          <img 
                            src={team.logo}
                            alt={team.shortName}
                            className="w-8 h-8 rounded object-cover border-2 border-white/30"
                          />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white border-2 border-white/30"
                            style={{ backgroundColor: team.primaryColor }}
                          >
                            {team.shortName?.[0]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Name */}
                  <h3 className="font-semibold text-white text-sm truncate mb-1">
                    {player.name}
                  </h3>
                  
                  {/* Role & Tier */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{player.role}</span>
                    <TierIcon className="w-4 h-4" style={{ color: tierColor }} />
                  </div>
                  
                  {/* Price (if sold) */}
                  {player.status === 'sold' && player.soldPrice && (
                    <p className="text-xs text-[var(--bwpl-primary)] mt-2 font-semibold">
                      {formatCurrency(player.soldPrice, { compact: true })}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {filteredPlayers.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-xl">No players found</p>
          </div>
        )}
      </div>
    </div>
  );
}
