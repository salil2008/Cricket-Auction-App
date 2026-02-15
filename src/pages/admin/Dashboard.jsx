import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCircle, 
  Wallet, 
  TrendingUp,
  Play,
  ChevronRight,
  Crown,
  Star,
  Shield,
  Zap,
  User
} from 'lucide-react';
import { useTeamStore, usePlayerStore, useConfigStore, useAuctionStore } from '../../stores';
import { Card, CardContent } from '../../components/common';
import { formatCurrency, getTierInfo } from '../../utils';

const tierIcons = {
  's-class': Crown,
  'a-class': Star,
  'b-class': Shield,
  'c-class': Zap,
  'd-class': User
};

const tierColors = {
  's-class': { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  'a-class': { color: 'text-gray-300', bg: 'bg-gray-300/10' },
  'b-class': { color: 'text-amber-600', bg: 'bg-amber-600/10' },
  'c-class': { color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'd-class': { color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
};

export default function Dashboard() {
  const teams = useTeamStore(state => state.teams);
  const players = usePlayerStore(state => state.players);
  const config = useConfigStore(state => state.config);
  const isLive = useAuctionStore(state => state.isLive);
  
  const stats = useMemo(() => {
    const soldPlayers = players.filter(p => p.status === 'sold');
    const unsoldPlayers = players.filter(p => p.status === 'unsold');
    const availablePlayers = players.filter(p => p.status === 'available');
    
    const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const totalPurse = teams.reduce((sum, t) => sum + (config?.totalPursePerTeam || 0), 0);
    
    // Dynamic tier counts from config
    const tierCounts = {};
    config?.tiers?.forEach(tier => {
      tierCounts[tier.id] = players.filter(p => p.tier === tier.id).length;
    });
    
    return {
      totalTeams: teams.length,
      totalPlayers: players.length,
      soldPlayers: soldPlayers.length,
      unsoldPlayers: unsoldPlayers.length,
      availablePlayers: availablePlayers.length,
      totalSpent,
      totalPurse,
      tierCounts
    };
  }, [teams, players, config]);
  
  const statCards = [
    {
      label: 'Teams',
      value: stats.totalTeams,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      link: '/admin/teams'
    },
    {
      label: 'Total Players',
      value: stats.totalPlayers,
      icon: UserCircle,
      color: 'from-purple-500 to-purple-600',
      link: '/admin/players'
    },
    {
      label: 'Players Sold',
      value: stats.soldPlayers,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600'
    },
    {
      label: 'Amount Spent',
      value: formatCurrency(stats.totalSpent, { compact: true }),
      icon: Wallet,
      color: 'from-amber-500 to-amber-600',
      isText: true
    }
  ];
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            {config?.leagueFullName || 'BWPL'} {config?.seasonYear || 2025}
          </p>
        </div>
        
        <Link
          to="/admin/auction"
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all
            ${isLive 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-gradient-to-r from-[var(--bwpl-primary)] to-[var(--bwpl-secondary)] text-black hover:opacity-90'
            }
          `}
        >
          <Play className="w-5 h-5" />
          {isLive ? 'Auction Live' : 'Start Auction'}
        </Link>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover={!!stat.link} onClick={stat.link ? () => window.location.href = stat.link : undefined}>
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">
                    {stat.isText ? stat.value : stat.value.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Pool by Tier */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-white mb-4">Player Pool by Tier</h2>
            <div className="space-y-4">
              {config?.tiers?.map(tier => {
                const Icon = tierIcons[tier.id] || User;
                const colors = tierColors[tier.id] || tierColors['d-class'];
                const count = stats.tierCounts[tier.id] || 0;
                const soldCount = players.filter(p => p.tier === tier.id && p.status === 'sold').length;
                
                return (
                  <div key={tier.id} className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <Icon className={`w-5 h-5 ${colors.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{tier.name}</span>
                        <span className="text-sm text-gray-400">{soldCount}/{count}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${colors.bg.replace('/10', '')}`}
                          initial={{ width: 0 }}
                          animate={{ width: count > 0 ? `${(soldCount / count) * 100}%` : '0%' }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Teams Overview */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Teams</h2>
              <Link 
                to="/admin/teams" 
                className="text-sm text-[var(--bwpl-primary)] hover:underline flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            {teams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No teams added yet</p>
                <Link 
                  to="/admin/teams" 
                  className="text-[var(--bwpl-primary)] text-sm hover:underline mt-2 inline-block"
                >
                  Add your first team
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.slice(0, 5).map(team => {
                  const teamPlayers = players.filter(p => p.soldToTeamId === team.id);
                  return (
                    <div 
                      key={team.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      {team.logo ? (
                        <img 
                          src={team.logo} 
                          alt={team.name} 
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: team.primaryColor || '#374151' }}
                        >
                          {team.shortName?.[0] || team.name?.[0] || 'T'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{team.name}</p>
                        <p className="text-xs text-gray-400">
                          {teamPlayers.length} players • {formatCurrency(team.remainingPurse, { compact: true })} left
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold text-white mb-4">Quick Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/teams"
              className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-white/20 hover:border-[var(--bwpl-primary)] hover:bg-[var(--bwpl-primary)]/5 transition-all group"
            >
              <Users className="w-8 h-8 text-gray-400 group-hover:text-[var(--bwpl-primary)]" />
              <div>
                <p className="font-medium text-white">Add Teams</p>
                <p className="text-sm text-gray-400">Set up participating teams</p>
              </div>
            </Link>
            
            <Link
              to="/admin/players"
              className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-white/20 hover:border-[var(--bwpl-primary)] hover:bg-[var(--bwpl-primary)]/5 transition-all group"
            >
              <UserCircle className="w-8 h-8 text-gray-400 group-hover:text-[var(--bwpl-primary)]" />
              <div>
                <p className="font-medium text-white">Add Players</p>
                <p className="text-sm text-gray-400">Import or add player pool</p>
              </div>
            </Link>
            
            <Link
              to="/admin/config"
              className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-white/20 hover:border-[var(--bwpl-primary)] hover:bg-[var(--bwpl-primary)]/5 transition-all group"
            >
              <Wallet className="w-8 h-8 text-gray-400 group-hover:text-[var(--bwpl-primary)]" />
              <div>
                <p className="font-medium text-white">Configure Purse</p>
                <p className="text-sm text-gray-400">Set purse & tier prices</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
